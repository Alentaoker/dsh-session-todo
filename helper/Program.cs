using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Threading;

namespace DshSessionTodo
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            TodoWindow.Log("main-start helper=0.4.5");
            Application app = new Application();
            app.ShutdownMode = ShutdownMode.OnMainWindowClose;
            TodoWindow window = new TodoWindow();
            app.Run(window);
        }
    }

    internal sealed partial class TodoWindow : Window
    {
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
        private static StreamReader Input;
        private static StreamWriter Output;
        private static readonly object OutputLock = new object();
        private static readonly string LogPath = Path.Combine(Environment.GetEnvironmentVariable("DSH_SESSION_TODO_LOG_DIR") ?? Path.GetTempPath(), "dsh-session-todo-helper.log");
        private static readonly Brush PageBrush = Brush("#1C1D21");
        private static readonly Brush CardBrush = Brush("#25262B");
        private static readonly Brush CardHoverBrush = Brush("#2C2E34");
        private static readonly Brush LineBrush = Brush("#36383F");
        private static readonly Brush TextBrush = Brush("#EEEFF1");
        private static readonly Brush MutedBrush = Brush("#92969F");
        private static readonly Brush AmberBrush = Brush("#D6A451");
        private static readonly Brush PurpleBrush = Brush("#A995DD");
        private static readonly Brush BlueBrush = Brush("#7DA6E8");
        private static readonly Brush RedBrush = Brush("#E07A76");
        private static readonly Brush GreenBrush = Brush("#9CCAB5");

        private readonly StackPanel content;
        private readonly TextBlock footerText;
        private readonly Button unreadTab;
        private readonly Button todoTab;
        private readonly TextBox searchBox;
        private Dictionary<string, object> state;
        private string tab = "todo";
        private string query = "";



        private static void OpenStreams()
        {
            try
            {
                Input = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false));
                Log("stdin-open");
            }
            catch (Exception error)
            {
                Input = null;
                Log("stdin-open-failed: " + error.Message);
            }
            try
            {
                Output = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));
                Output.AutoFlush = true;
                Log("stdout-open");
            }
            catch (Exception error)
            {
                Output = null;
                Log("stdout-open-failed: " + error.Message);
            }
        }

        private static Brush Brush(string hex)
        {
            return (Brush)new BrushConverter().ConvertFromString(hex);
        }

        internal static void Log(string message)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(LogPath));
                File.AppendAllText(LogPath, DateTime.Now.ToString("O", CultureInfo.InvariantCulture) + " " + message + Environment.NewLine, new UTF8Encoding(false));
            }
            catch
            {
                // Diagnostics must never prevent the window from opening.
            }
        }

        private static string S(object value)
        {
            if (value == null) return "";
            return Convert.ToString(value, CultureInfo.InvariantCulture);
        }

        private static double N(object value)
        {
            if (value == null) return 0;
            double result;
            return double.TryParse(S(value), NumberStyles.Any, CultureInfo.InvariantCulture, out result) ? result : 0;
        }

        private static Dictionary<string, object> D(object value)
        {
            return value as Dictionary<string, object>;
        }

        private static object[] A(object value)
        {
            object[] array = value as object[];
            return array ?? new object[0];
        }

        private static bool B(object value)
        {
            return value is bool && (bool)value;
        }

        private static string ColorOf(object value, string fallback)
        {
            string text = S(value);
            return text.Length == 7 && text[0] == '#' ? text : fallback;
        }

        private Button SmallButton(string text, Action action)
        {
            Button button = new Button();
            button.Content = text;
            button.Padding = new Thickness(7, 3, 7, 3);
            button.Margin = new Thickness(0, 0, 5, 0);
            button.FontSize = 11;
            button.Foreground = TextBrush;
            button.Background = Brushes.Transparent;
            button.BorderBrush = LineBrush;
            button.BorderThickness = new Thickness(0);
            StyleButton(button);
            button.Cursor = Cursors.Hand;
            button.Click += delegate { action(); };
            return button;
        }

        private Button PrimaryButton(string text, Action action)
        {
            Button button = SmallButton(text, action);
            button.Background = GreenBrush;
            button.Foreground = Brush("#17191D");
            button.BorderBrush = GreenBrush;
            button.FontWeight = FontWeights.SemiBold;
            return button;
        }

        private Button TabButton(string text, Action action)
        {
            Button button = SmallButton(text, action);
            button.FontSize = 12; button.Padding = new Thickness(11, 6, 11, 6);
            button.Margin = new Thickness(0, 0, 4, 0); return button;
        }

        private void OnLoaded(object sender, RoutedEventArgs args)
        {
            Log("loaded");
            if (Output != null) lock (OutputLock) {
                Output.WriteLine(Json.Serialize(new Dictionary<string, object> { { "type", "ready" }, { "version", "0.4.5" }, { "integrityLevel", DshForeground.IntegrityLevel } })); Output.Flush();
            }
            StartReader();
            Render();
            try
            {
                IntPtr handle = new WindowInteropHelper(this).Handle;
                ShowWindow(handle, 9);
                SetForegroundWindow(handle);
                Activate();
                Log("force-shown handle=" + handle.ToString());
            }
            catch (Exception error)
            {
                Log("force-show failed: " + error.Message);
            }
        }

        private void StartReader()
        {
            Log("reader-start");
            if (Input == null)
            {
                Log("reader-skipped: stdin unavailable");
                return;
            }
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    string line;
                    while ((line = Input.ReadLine()) != null)
                    {
                        string copy = line;
                        Dispatcher.BeginInvoke(new Action(delegate { HandleLine(copy); }));
                    }
                    Dispatcher.BeginInvoke(new Action(delegate { Close(); }));
                }
                catch (Exception error)
                {
                    Log("stdin-error: " + error.Message);
                    Dispatcher.BeginInvoke(new Action(delegate { Close(); }));
                }
            });
        }

        private void HandleLine(string line)
        {
            try
            {
                Dictionary<string, object> message = D(Json.DeserializeObject(line));
                if (message == null) return;
                string type = S(message.ContainsKey("type") ? message["type"] : null);
                if (type == "state")
                {
                    state = D(message.ContainsKey("data") ? message["data"] : null);
                    string previousEditor = editingId;
                    bool wasSaving = noteSaving;
                    ReconcileNote();
                    ObserveNavigationState();
                    ObserveTitleRename();
                    string stamp = VisualStamp();
                    if (stamp != visualStateStamp || previousEditor != editingId || wasSaving != noteSaving)
                    { visualStateStamp = stamp; Render(); }
                }
                else if (type == "view")
                {
                    Dictionary<string, object> request = D(V(message, "request"));
                    if (pendingViewId != null && S(V(request, "sessionId")) == pendingViewId) pendingViewNonce = S(V(request, "nonce"));
                }
                else if (type == "view/result")
                {
                    if (pendingViewId == S(V(message, "sessionId")) && (pendingViewNonce == null || pendingViewNonce == S(V(message, "nonce")))) FinishNavigation(B(V(message, "success")), S(V(message, "message")));
                }
                else if (type == "rename/result")
                {
                    if (renameSaving && renamingId == S(V(message, "sessionId")) && (pendingRenameNonce == null || pendingRenameNonce == S(V(message, "nonce")))) FinishTitleRename(B(V(message, "success")), S(V(message, "message")));
                }
                else if (type == "error")
                {
                    noteSaving = false;
                    renameSaving = false;
                    groupNameSaving = false;
                    SetGroupEditorReadOnly();
                    if (groupRenameTimeout != null) groupRenameTimeout.Stop();
                    SetStatus("操作失败：" + S(message.ContainsKey("message") ? message["message"] : null));
                    Render();
                }
                else if (type == "focus")
                {
                    ShowWindow(new WindowInteropHelper(this).Handle, 9);
                    Activate();
                }
            }
            catch (Exception error)
            {
                SetStatus("状态解析失败：" + error.Message);
            }
        }

        private void SendAction(string endpoint, Dictionary<string, object> payload)
        {
            Log("action " + endpoint);
            if (Output == null)
            {
                SetStatus("连接已断开");
                noteSaving = false;
                return;
            }
            SetStatus("");
            Dictionary<string, object> message = new Dictionary<string, object>();
            message["type"] = "action";
            message["endpoint"] = endpoint;
            message["payload"] = payload ?? new Dictionary<string, object>();
            string json = Json.Serialize(message);
            lock (OutputLock)
            {
                try
                {
                    Output.WriteLine(json);
                    Output.Flush();
                }
                catch
                {
                    noteSaving = false;
                    SetStatus("连接已断开");
                }
            }
        }

        private void SendTaskAction(string endpoint, string sessionId, string key, object value)
        {
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["sessionId"] = sessionId;
            if (key != null) payload[key] = value;
            SendAction(endpoint, payload);
        }

        private void Render()
        {
            if (unreadTab == null) return;
            unreadTab.Foreground = tab == "unread" ? TextBrush : MutedBrush;
            unreadTab.Background = tab == "unread" ? CardHoverBrush : Brushes.Transparent;
            todoTab.Foreground = tab == "todo" ? TextBrush : MutedBrush;
            todoTab.Background = tab == "todo" ? CardHoverBrush : Brushes.Transparent;

            double offset = scroller.VerticalOffset;
            TextBox focusedNote = Keyboard.FocusedElement as TextBox;
            if (focusedNote != null && System.Windows.Automation.AutomationProperties.GetName(focusedNote) == "重命名会话标题")
            { titleFocusRequested = true; renameCaret = focusedNote.SelectionStart; renameSelectionLength = focusedNote.SelectionLength; }
            if (focusedNote != null && System.Windows.Automation.AutomationProperties.GetName(focusedNote) == "个人备注")
            { noteFocusRequested = true; noteCaret = focusedNote.SelectionStart; noteSelectionLength = focusedNote.SelectionLength; }
            buildingRows = true;
            content.Children.Clear();
            buildingRows = false;
            if (state == null)
            {
                content.Children.Add(Empty("正在连接…"));
                return;
            }

            RefreshGroupTabs();
            TodoTabCount();
            unreadTab.Content = "待查看  " + CountUnread();
            if (tab == "unread") RenderUnread();
            else RenderTodo();
            scroller.ScrollToVerticalOffset(offset);
        }

        private Dictionary<string, object> FindWorkspace(string sessionId)
        {
            object workspaces = V(state, "workspaces");
            if (!object.ReferenceEquals(indexedWorkspaces, workspaces))
            {
                indexedWorkspaces = workspaces; workspaceBySession.Clear();
                foreach (object item in A(workspaces))
                {
                    Dictionary<string, object> workspace = D(item); if (workspace == null) continue;
                    foreach (object id in A(V(workspace, "sessionIds"))) workspaceBySession[S(id)] = workspace;
                }
            }
            Dictionary<string, object> found;
            return workspaceBySession.TryGetValue(sessionId, out found) ? found : null;
        }

        private string WorkspaceTitle(string sessionId)
        {
            Dictionary<string, object> workspace = FindWorkspace(sessionId);
            return workspace == null ? "未分组" : S(workspace.ContainsKey("title") ? workspace["title"] : "未分组");
        }

        private string WorkspaceKey(string sessionId)
        {
            Dictionary<string, object> workspace = FindWorkspace(sessionId);
            return workspace == null ? "ungrouped" : S(workspace.ContainsKey("workspaceId") ? workspace["workspaceId"] : "ungrouped");
        }

        private bool PassesFilter(string sessionId, string title, string note)
        {
            if (query.Length == 0) return true;
            string haystack = (S(title) + " " + WorkspaceTitle(sessionId) + " " + S(note)).ToLowerInvariant();
            return haystack.Contains(query.ToLowerInvariant());
        }

        private Dictionary<string, object> Task(string sessionId)
        {
            Dictionary<string, object> tasks = D(state.ContainsKey("tasks") ? state["tasks"] : null);
            if (tasks == null || !tasks.ContainsKey(sessionId)) return null;
            return D(tasks[sessionId]);
        }

        private string TitleOf(string sessionId, Dictionary<string, object> task, Dictionary<string, object> result)
        {
            if (task != null)
            {
                string alias = S(task.ContainsKey("alias") ? task["alias"] : null);
                if (alias.Length > 0) return alias;
                string liveTitle = S(V(D(V(D(V(state, "sessions")), sessionId)), "title"));
                if (liveTitle.Length > 0) return liveTitle;
                string title = S(task.ContainsKey("title") ? task["title"] : null);
                if (title.Length > 0) return title;
            }
            string sessionTitle = S(V(D(V(D(V(state, "sessions")), sessionId)), "title"));
            if (sessionTitle.Length > 0) return sessionTitle;
            if (result != null)
            {
                string title = S(result.ContainsKey("title") ? result["title"] : null);
                if (title.Length > 0) return title;
            }
            return sessionId;
        }

        private List<Dictionary<string, object>> InboxRows()
        {
            Dictionary<string, object> results = D(V(state, "results")) ?? new Dictionary<string, object>();
            Dictionary<string, object> sessions = D(V(state, "sessions")) ?? new Dictionary<string, object>();
            Dictionary<string, object> read = D(V(state, "read")) ?? new Dictionary<string, object>();
            List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
            foreach (string id in results.Keys.Union(sessions.Keys))
            {
                Dictionary<string, object> result = D(V(results, id));
                Dictionary<string, object> live = D(V(sessions, id));
                bool unread = result != null && N(V(result, "version")) > N(V(read, id));
                string pending = S(V(live, "pendingKind")); bool running = B(V(live, "running"));
                if (B(V(live, "archived")) || (!unread && !running && pending.Length == 0)) continue;
                Dictionary<string, object> task = Task(id);
                string title = TitleOf(id, task, result);
                if (!PassesFilter(id, title, S(V(task, "note")))) continue;
                Dictionary<string, object> display = result == null ? new Dictionary<string, object>() : new Dictionary<string, object>(result);
                display["kind"] = pending.Length > 0 ? pending : running ? "running" : S(V(result, "kind"));
                rows.Add(new Dictionary<string, object> { { "sessionId", id }, { "title", title }, { "task", task }, { "result", display }, { "running", running } });
            }
            return rows.OrderByDescending(r => B(V(r, "running"))).ThenByDescending(r => N(V(D(V(r, "result")), "at"))).ToList();
        }

        private void RenderUnread()
        {
            List<Dictionary<string, object>> rows = InboxRows();
            unreadTab.Content = "待查看  " + rows.Count;
            if (rows.Count == 0) { content.Children.Add(Empty("暂无待查看内容")); return; }
            foreach (Dictionary<string, object> row in rows) content.Children.Add(UnreadCard(row));
        }

        private void TodoTabCount()
        {
            Dictionary<string, object> tasks = D(state.ContainsKey("tasks") ? state["tasks"] : null);
            int active = 0;
            if (tasks != null)
            {
                foreach (object item in tasks.Values)
                {
                    Dictionary<string, object> task = D(item);
                    if (task != null && !B(task.ContainsKey("completed") ? task["completed"] : null)) active++;
                }
            }
            todoTab.Content = "待办  " + active;
        }

        private void RenderTodo()
        {
            Dictionary<string, object> tasks = D(V(state, "tasks"));
            List<Dictionary<string, object>> active = new List<Dictionary<string, object>>();
            List<Dictionary<string, object>> completed = new List<Dictionary<string, object>>();
            if (tasks != null) foreach (KeyValuePair<string, object> pair in tasks)
            {
                Dictionary<string, object> task = D(pair.Value);
                if (task == null || TaskGroup(task) != selectedGroup) continue;
                string title = TitleOf(pair.Key, task, null);
                if (!PassesFilter(pair.Key, title, S(V(task, "note")))) continue;
                Dictionary<string, object> row = new Dictionary<string, object> { { "sessionId", pair.Key }, { "task", task }, { "title", title } };
                if (B(V(task, "completed"))) completed.Add(row); else active.Add(row);
            }
            active = active.OrderByDescending(r => N(V(D(V(r, "task")), "updatedAt"))).ToList();
            completed = completed.OrderByDescending(r => N(V(D(V(r, "task")), "completedAt"))).ToList();
            if (active.Count == 0) content.Children.Add(Empty(query.Length > 0 ? "没有匹配的待办" : "该分组暂无待办"));
            foreach (Dictionary<string, object> row in active) content.Children.Add(TaskCard(row, false));
            if (completed.Count > 0)
            {
                Button toggle = SmallButton((completedOpen ? "⌄" : "›") + "  已完成  " + completed.Count, delegate { completedOpen = !completedOpen; Render(); });
                toggle.Foreground = MutedBrush; toggle.Margin = new Thickness(16, 10, 16, 4); toggle.HorizontalAlignment = HorizontalAlignment.Left;
                content.Children.Add(toggle);
                if (completedOpen) foreach (Dictionary<string, object> row in completed) content.Children.Add(TaskCard(row, true));
            }
        }

        private int CountUnread() { return InboxRows().Count; }

        private FrameworkElement Empty(string text)
        {
            StackPanel panel = new StackPanel { Margin = new Thickness(24, 48, 24, 24) };
            TextBlock title = new TextBlock { Text = text, TextWrapping = TextWrapping.Wrap, TextAlignment = TextAlignment.Center, Foreground = MutedBrush, FontSize = 12 };
            panel.Children.Add(title);
            return panel;
        }

        private FrameworkElement SectionLabel(string text)
        {
            TextBlock label = new TextBlock { Text = text, Margin = new Thickness(14, 9, 14, 4), FontSize = 10.5, Foreground = MutedBrush };
            return label;
        }

        private FrameworkElement GroupLabel(Dictionary<string, object> group, int count)
        {
            string id = S(V(group, "id"));
            Grid row = new Grid { Margin = new Thickness(16, 5, 14, 0) };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            Button label = SmallButton("", delegate { if (!collapsedGroups.Add(id)) collapsedGroups.Remove(id); Render(); });
            StackPanel title = new StackPanel { Orientation = Orientation.Horizontal };
            title.Children.Add(new Border { Width = 6, Height = 6, CornerRadius = new CornerRadius(3), Background = Brush(ColorOf(V(group, "color"), "#92969F")), Margin = new Thickness(0, 0, 8, 0) });
            title.Children.Add(new TextBlock { Text = S(V(group, "name")) + "  " + count + (collapsedGroups.Contains(id) ? "  ›" : ""), FontSize = 10.5, Foreground = MutedBrush });
            label.Content = title; label.HorizontalAlignment = HorizontalAlignment.Left; label.Padding = new Thickness(0, 3, 3, 3); label.ToolTip = "展开或收起分组";
            row.Children.Add(label);
            if (id != "unassigned") { Button edit = IconButton("more", "分组操作", delegate { EditGroup(group); }); edit.Height = 22; Grid.SetColumn(edit, 1); row.Children.Add(edit); }
            return row;
        }

        private FrameworkElement UnreadCard(Dictionary<string, object> row) { return CompactRow(row, false, true); }
        private FrameworkElement TaskCard(Dictionary<string, object> row, bool completed) { return CompactRow(row, completed, false); }

        private Brush GroupColor(Dictionary<string, object> task)
        {
            string groupId = S(task.ContainsKey("groupId") ? task["groupId"] : "unassigned");
            foreach (object item in A(state.ContainsKey("groups") ? state["groups"] : null))
            {
                Dictionary<string, object> group = D(item);
                if (group != null && S(group.ContainsKey("id") ? group["id"] : null) == groupId)
                    return Brush(ColorOf(group.ContainsKey("color") ? group["color"] : null, "#8A8F98"));
            }
            return Brush("#8A8F98");
        }

        private FrameworkElement Card(StackPanel stack, Brush groupColor, bool completed)
        {
            Border border = new Border();
            border.Background = completed ? Brush("#1B1D21") : CardBrush;
            border.BorderBrush = LineBrush;
            border.BorderThickness = new Thickness(1, 1, 1, 1);
            border.CornerRadius = new CornerRadius(8);
            border.Padding = new Thickness(9, 8, 9, 8);
            border.Margin = new Thickness(12, 0, 12, 7);
            if (groupColor != null)
            {
                Grid wrapper = new Grid();
                Border stripe = new Border { Width = 2, Background = groupColor, HorizontalAlignment = HorizontalAlignment.Left, CornerRadius = new CornerRadius(1) };
                border.Padding = new Thickness(11, 8, 9, 8);
                wrapper.Children.Add(border);
                wrapper.Children.Add(stripe);
                border.Child = stack;
                return wrapper;
            }
            border.Child = stack;
            return border;
        }

        private string StatusLabel(string kind, bool child)
        {
            if (child) return kind == "error" ? "子代理异常" : "子代理结果";
            switch (kind)
            {
                case "error": return "异常";
                case "blocked": return "已阻塞";
                case "attention": return "需关注";
                case "interrupted": return "已中断";
                case "approval": return "新审批提醒";
                case "question": return "新问题提醒";
                case "plan-review": return "计划待审提醒";
                case "running": return "进行中";
                default: return "新结果";
            }
        }

        private void AddTask(string sessionId, string title, string groupId)
        {
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["sessionId"] = sessionId;
            payload["title"] = title;
            payload["groupId"] = groupId;
            SendAction("task/add", payload);
        }

        private void MarkRead(string sessionId)
        {
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["sessionId"] = sessionId;
            SendAction("task/mark-read", payload);
        }

        private void CompleteTask(string sessionId, bool completed)
        {
            SendTaskAction("task/complete", sessionId, "completed", completed);
        }

        private void ViewSession(string sessionId)
        {
            pendingViewId = sessionId; pendingViewNonce = null;
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["sessionId"] = sessionId;
            SendAction("view", payload);
            SetStatus("");
            if (navigationTimeout != null) navigationTimeout.Stop();
            navigationTimeout = new DispatcherTimer { Interval = TimeSpan.FromSeconds(16) };
            navigationTimeout.Tick += delegate { FinishNavigation(false, "DSH 未确认跳转，请刷新 DSH 后重试"); }; navigationTimeout.Start();
            // Queue the target before waking the renderer's focus/visibility listener.
            BeginForegroundActivation();
        }

        private void EditNote(string sessionId, Dictionary<string, object> task)
        {
            if (noteSaving) return;
            editingId = sessionId; noteDraft = S(V(task, "note")); noteFocusRequested = true; noteCaret = noteDraft.Length; noteSelectionLength = 0; Render();
        }

        private void ShowMoveMenu(string sessionId, string currentGroup, Button target)
        {
            ContextMenu menu = Menu();
            foreach (object item in A(state.ContainsKey("groups") ? state["groups"] : null))
            {
                Dictionary<string, object> group = D(item);
                if (group == null) continue;
                string id = S(group.ContainsKey("id") ? group["id"] : null);
                MenuItem row = new MenuItem();
                row.Header = S(group.ContainsKey("name") ? group["name"] : id);
                row.IsChecked = id == currentGroup;
                row.Click += delegate { SendTaskAction("task/move", sessionId, "groupId", id); };
                menu.Items.Add(row);
            }
            MenuItem unassigned = new MenuItem();
            unassigned.Header = "未分区";
            unassigned.IsChecked = currentGroup == "unassigned";
            unassigned.Click += delegate { SendTaskAction("task/move", sessionId, "groupId", "unassigned"); };
            menu.Items.Add(new Separator());
            menu.Items.Add(unassigned);
            menu.PlacementTarget = target;
            menu.IsOpen = true;
        }

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int command);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);
    }
}
