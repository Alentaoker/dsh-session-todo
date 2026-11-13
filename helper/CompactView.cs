using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;

namespace DshSessionTodo
{
    internal sealed partial class TodoWindow
    {
        private Grid shell;
        private Border statusBar;
        private StackPanel body;
        private ScrollViewer scroller;
        private Button pinButton;
        private Button foldButton;
        private Border searchArea;
        private bool folded;
        private bool completedOpen;
        private double expandedHeight = 490;
        private string editingId;
        private string noteDraft = "";
        private bool noteSaving;
        private bool noteFocusRequested;
        private int noteCaret;
        private int noteSelectionLength;
        private System.Windows.Threading.DispatcherTimer noteTimeout;
        private System.Windows.Threading.DispatcherTimer navigationTimeout;
        private string pendingViewId;
        private string pendingViewNonce;
        private readonly HashSet<string> collapsedGroups = new HashSet<string>();
        private static ControlTemplate compactButtonTemplate;
        private static ControlTemplate compactTitleTemplate;
        private static readonly Dictionary<string, Geometry> glyphs = new Dictionary<string, Geometry>();
        private string visualStateStamp;
        private object indexedWorkspaces;
        private readonly Dictionary<string, Dictionary<string, object>> workspaceBySession = new Dictionary<string, Dictionary<string, object>>();
        private System.Windows.Threading.DispatcherTimer searchDelay;
        private System.Windows.Threading.DispatcherTimer statusTimeout;

        private string VisualStamp()
        {
            object revision = V(state, "revision");
            return (revision == null ? Json.Serialize(new object[] { V(state, "tasks"), V(state, "results"), V(state, "read"), V(state, "groups") }) : S(revision)) + "|" + S(V(state, "liveRevision")) + "|" + Json.Serialize(V(state, "workspaces"));
        }

        public TodoWindow()
        {
            OpenStreams();
            Title = "DSH 会话待办";
            Width = 360; Height = 490; MinWidth = 300; MinHeight = 260;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            ResizeMode = ResizeMode.CanResize;
            ShowInTaskbar = false;
            Topmost = true;
            WindowStartupLocation = WindowStartupLocation.Manual;
            Left = Math.Max(8, SystemParameters.WorkArea.Right - Width - 24);
            Top = Math.Max(8, SystemParameters.WorkArea.Bottom - Height - 24);
            Foreground = TextBrush;
            FontFamily = new FontFamily("Segoe UI, Microsoft YaHei UI");
            FontSize = 12;
            UseLayoutRounding = true;
            TextOptions.SetTextFormattingMode(this, TextFormattingMode.Display);
            TextOptions.SetTextRenderingMode(this, TextRenderingMode.ClearType);

            shell = new Grid { Margin = new Thickness(1) };
            shell.RowDefinitions.Add(new RowDefinition { Height = new GridLength(48) });
            shell.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            shell.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            Border frame = new Border { Background = PageBrush, BorderBrush = LineBrush, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(14), Child = shell };
            Content = frame;

            Grid header = new Grid { Margin = new Thickness(16, 0, 10, 0), Background = Brushes.Transparent };
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            header.Children.Add(new TextBlock { Text = "会话待办", FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center });
            Border dragArea = new Border { Background = Brushes.Transparent, Cursor = Cursors.SizeAll };
            dragArea.MouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs e) { if (e.ClickCount == 2) ToggleFold(); else { try { DragMove(); } catch { } } };
            Grid.SetColumn(dragArea, 1); header.Children.Add(dragArea);
            StackPanel controls = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
            pinButton = IconButton("pin", "取消置顶", delegate { Topmost = !Topmost; pinButton.Foreground = Topmost ? GreenBrush : MutedBrush; pinButton.ToolTip = Topmost ? "取消置顶" : "置顶"; });
            pinButton.Foreground = GreenBrush;
            foldButton = IconButton("fold", "收起", ToggleFold);
            controls.Children.Add(pinButton); controls.Children.Add(foldButton);
            controls.Children.Add(IconButton("close", "关闭", delegate { Close(); }));
            Grid.SetColumn(controls, 2); header.Children.Add(controls);
            shell.Children.Add(header);

            body = new StackPanel();
            Grid main = new Grid();
            main.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            main.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            main.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            Grid.SetRow(main, 1); shell.Children.Add(main);
            body.Tag = main;

            Grid navigation = new Grid { Margin = new Thickness(12, 0, 12, 9) };
            navigation.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            navigation.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            StackPanel tabs = new StackPanel { Orientation = Orientation.Horizontal };
            todoTab = TabButton("待办", delegate { tab = "todo"; Render(); });
            unreadTab = TabButton("待查看", delegate { tab = "unread"; Render(); });
            tabs.Children.Add(todoTab); tabs.Children.Add(unreadTab); navigation.Children.Add(tabs);
            StackPanel tools = new StackPanel { Orientation = Orientation.Horizontal };
            tools.Children.Add(IconButton("search", "搜索", delegate { searchArea.Visibility = searchArea.Visibility == Visibility.Visible ? Visibility.Collapsed : Visibility.Visible; if (searchArea.Visibility == Visibility.Visible) searchBox.Focus(); else { searchBox.Text = ""; } }));
            tools.Children.Add(IconButton("more", "更多", ShowGlobalMenu));
            Grid.SetColumn(tools, 1); navigation.Children.Add(tools); main.Children.Add(navigation);

            StackPanel filters = new StackPanel { Margin = new Thickness(16, 0, 16, 7) };
            groupStrip = CreateGroupStrip();
            filters.Margin = new Thickness(0, 0, 0, 7);
            filters.Children.Add(groupStrip);
            searchBox = new TextBox { Background = CardBrush, Foreground = TextBrush, CaretBrush = GreenBrush, BorderBrush = LineBrush, BorderThickness = new Thickness(1), FontSize = 12, Padding = new Thickness(9, 6, 9, 6) };
            AutomationProperties.SetName(searchBox, "搜索标题和备注"); searchBox.ToolTip = "搜索标题和备注";
            searchDelay = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(120) };
            searchDelay.Tick += delegate { searchDelay.Stop(); query = searchBox.Text.Trim(); Render(); };
            searchBox.TextChanged += delegate { searchDelay.Stop(); searchDelay.Start(); };
            searchArea = new Border { Child = searchBox, Visibility = Visibility.Collapsed, Margin = new Thickness(16, 2, 16, 4) }; filters.Children.Add(searchArea);
            Grid.SetRow(filters, 1); main.Children.Add(filters);

            content = new StackPanel { Margin = new Thickness(0, 0, 0, 14) };
            scroller = new ScrollViewer { Content = content, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled, Padding = new Thickness(0), PanningMode = PanningMode.VerticalOnly };
            scroller.Resources.Add(typeof(ScrollBar), SlimScrollbar());
            Grid.SetRow(scroller, 2); main.Children.Add(scroller);

            footerText = new TextBlock { Text = "", TextWrapping = TextWrapping.Wrap, FontSize = 10.5, Foreground = RedBrush, Margin = new Thickness(14, 8, 14, 8) };
            statusBar = new Border { Child = footerText, Visibility = Visibility.Collapsed, Background = Brush("#292022"), CornerRadius = new CornerRadius(0, 0, 13, 13) };
            Grid.SetRow(statusBar, 2); shell.Children.Add(statusBar);

            Thumb grip = new Thumb { Width = 14, Height = 14, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Bottom, Cursor = Cursors.SizeNWSE, Opacity = .35 };
            ControlTemplate gripTemplate = new ControlTemplate(typeof(Thumb));
            FrameworkElementFactory gripMark = new FrameworkElementFactory(typeof(TextBlock)); gripMark.SetValue(TextBlock.TextProperty, "⌟"); gripMark.SetValue(TextBlock.ForegroundProperty, MutedBrush); gripTemplate.VisualTree = gripMark; grip.Template = gripTemplate;
            grip.DragDelta += delegate(object sender, DragDeltaEventArgs e) { Width = Math.Max(MinWidth, Width + e.HorizontalChange); if (!folded) Height = Math.Max(MinHeight, Height + e.VerticalChange); };
            Grid.SetRowSpan(grip, 3); shell.Children.Add(grip);
            Loaded += OnLoaded;
            Closing += delegate { try { if (Output != null) Output.Flush(); } catch { } };
        }

        private void ToggleFold()
        {
            folded = !folded;
            FrameworkElement main = (FrameworkElement)body.Tag;
            if (folded) { expandedHeight = Height; main.Visibility = Visibility.Collapsed; statusBar.Visibility = Visibility.Collapsed; MinHeight = 48; Height = 50; }
            else { main.Visibility = Visibility.Visible; Height = expandedHeight; MinHeight = 260; }
            foldButton.ToolTip = folded ? "展开" : "收起";
            foldButton.Content = Glyph(folded ? "expand" : "fold");
        }

        private static Style SlimScrollbar()
        {
            return (Style)System.Windows.Markup.XamlReader.Parse(@"<Style xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='ScrollBar'>
              <Setter Property='Width' Value='5'/><Setter Property='MinWidth' Value='5'/><Setter Property='Margin' Value='0,3,3,3'/>
              <Setter Property='Template'><Setter.Value><ControlTemplate TargetType='ScrollBar'>
                <Track Name='PART_Track' IsDirectionReversed='True' Orientation='Vertical'>
                  <Track.DecreaseRepeatButton><RepeatButton Command='ScrollBar.PageUpCommand' Opacity='0' Focusable='False'/></Track.DecreaseRepeatButton>
                  <Track.Thumb><Thumb><Thumb.Template><ControlTemplate TargetType='Thumb'><Border CornerRadius='2' Background='#484B54'/></ControlTemplate></Thumb.Template></Thumb></Track.Thumb>
                  <Track.IncreaseRepeatButton><RepeatButton Command='ScrollBar.PageDownCommand' Opacity='0' Focusable='False'/></Track.IncreaseRepeatButton>
                </Track>
              </ControlTemplate></Setter.Value></Setter>
            </Style>");
        }

        private void SetStatus(string text)
        {
            if (statusTimeout != null) statusTimeout.Stop();
            footerText.Text = text ?? "";
            statusBar.Visibility = string.IsNullOrEmpty(text) || folded ? Visibility.Collapsed : Visibility.Visible;
            if (!string.IsNullOrEmpty(text)) {
                statusTimeout = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromSeconds(6) };
                statusTimeout.Tick += delegate { statusTimeout.Stop(); footerText.Text = ""; statusBar.Visibility = Visibility.Collapsed; };
                statusTimeout.Start();
            }
        }

        private static void StyleButton(Button button)
        {
            if (compactButtonTemplate != null) { button.Template = compactButtonTemplate; button.FocusVisualStyle = null; return; }
            ControlTemplate template = new ControlTemplate(typeof(Button));
            FrameworkElementFactory border = new FrameworkElementFactory(typeof(Border));
            border.Name = "surface";
            border.SetValue(Border.CornerRadiusProperty, new CornerRadius(6));
            border.SetBinding(Border.BackgroundProperty, new System.Windows.Data.Binding("Background") { RelativeSource = new System.Windows.Data.RelativeSource(System.Windows.Data.RelativeSourceMode.TemplatedParent) });
            border.SetBinding(Border.PaddingProperty, new System.Windows.Data.Binding("Padding") { RelativeSource = new System.Windows.Data.RelativeSource(System.Windows.Data.RelativeSourceMode.TemplatedParent) });
            border.SetBinding(Border.BorderBrushProperty, new System.Windows.Data.Binding("BorderBrush") { RelativeSource = new System.Windows.Data.RelativeSource(System.Windows.Data.RelativeSourceMode.TemplatedParent) });
            border.SetBinding(Border.BorderThicknessProperty, new System.Windows.Data.Binding("BorderThickness") { RelativeSource = new System.Windows.Data.RelativeSource(System.Windows.Data.RelativeSourceMode.TemplatedParent) });
            FrameworkElementFactory presenter = new FrameworkElementFactory(typeof(ContentPresenter));
            presenter.SetValue(FrameworkElement.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            presenter.SetValue(FrameworkElement.VerticalAlignmentProperty, VerticalAlignment.Center);
            border.AppendChild(presenter); template.VisualTree = border;
            Trigger hover = new Trigger { Property = UIElement.IsMouseOverProperty, Value = true };
            hover.Setters.Add(new Setter(Border.BackgroundProperty, CardHoverBrush, "surface")); template.Triggers.Add(hover);
            Trigger focus = new Trigger { Property = UIElement.IsKeyboardFocusedProperty, Value = true };
            focus.Setters.Add(new Setter(Border.BorderBrushProperty, GreenBrush, "surface"));
            focus.Setters.Add(new Setter(Border.BorderThicknessProperty, new Thickness(1), "surface")); template.Triggers.Add(focus);
            Trigger disabled = new Trigger { Property = UIElement.IsEnabledProperty, Value = false };
            disabled.Setters.Add(new Setter(UIElement.OpacityProperty, .45)); template.Triggers.Add(disabled);
            compactButtonTemplate = template;
            button.Template = compactButtonTemplate;
            button.FocusVisualStyle = null;
        }

        private FrameworkElement Glyph(string name)
        {
            string data;
            switch (name)
            {
                case "close": data = "M4,4 L12,12 M12,4 L4,12"; break;
                case "pin": data = "M5,2 L11,2 M6,2 L6,6 4,9 12,9 10,6 10,2 M8,9 L8,14"; break;
                case "fold": data = "M4,10 L8,6 12,10"; break;
                case "expand": data = "M4,6 L8,10 12,6"; break;
                case "search": data = "M10.5,6.5 A4,4 0 1 1 2.5,6.5 A4,4 0 1 1 10.5,6.5 M10,10 L14,14"; break;
                case "check": data = "M3,8 L6.5,11.5 13,4.5"; break;
                case "more": data = "M3,7 L3,9 M8,7 L8,9 M13,7 L13,9"; break;
                default: data = "M4,8 L12,8 M8,4 L8,12"; break;
            }
            Geometry geometry;
            if (!glyphs.TryGetValue(name, out geometry)) { geometry = Geometry.Parse(data); geometry.Freeze(); glyphs[name] = geometry; }
            System.Windows.Shapes.Path path = new System.Windows.Shapes.Path { Data = geometry, StrokeThickness = 1.4, StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round, StrokeLineJoin = PenLineJoin.Round, Width = 16, Height = 16, Stretch = Stretch.None };
            path.SetBinding(System.Windows.Shapes.Shape.StrokeProperty, new System.Windows.Data.Binding("Foreground") { RelativeSource = new System.Windows.Data.RelativeSource(System.Windows.Data.RelativeSourceMode.FindAncestor, typeof(Button), 1) });
            return path;
        }

        private Button IconButton(string icon, string label, Action action)
        {
            Button button = SmallButton("", action);
            button.Content = Glyph(icon); button.ToolTip = label;
            button.Width = 28; button.Height = 28; button.Margin = new Thickness(1, 0, 1, 0); button.Padding = new Thickness(0);
            AutomationProperties.SetName(button, label); return button;
        }

        private ContextMenu Menu()
        {
            return DarkMenu();
        }

        private MenuItem MenuAction(string title, Action action)
        {
            MenuItem item = new MenuItem { Header = title, Padding = new Thickness(8, 5, 8, 5) };
            item.Click += delegate { action(); }; return item;
        }

        private void ShowGlobalMenu()
        {
            ContextMenu menu = Menu();
            menu.Items.Add(MenuAction("新建分组", delegate { EditGroup(null); }));
            MenuItem manage = new MenuItem { Header = "管理分组" };
            foreach (object item in A(state == null ? null : V(state, "groups")))
            {
                Dictionary<string, object> group = D(item); if (group == null) continue;
                manage.Items.Add(MenuAction(S(V(group, "name")), delegate { EditGroup(group); }));
            }
            menu.Items.Add(manage);
            menu.Items.Add(MenuAction(completedOpen ? "收起已完成" : "查看已完成", delegate { completedOpen = !completedOpen; tab = "todo"; Render(); }));
            MenuItem markAll = MenuAction("全部标记已读", delegate { SendAction("mark-all-read", null); });
            markAll.IsEnabled = state != null && CountUnread() > 0; menu.Items.Add(markAll);
            menu.PlacementTarget = this; menu.IsOpen = true;
        }

        private static object V(Dictionary<string, object> value, string key)
        { return value != null && value.ContainsKey(key) ? value[key] : null; }

        private ContextMenu TaskMenu(string id, Dictionary<string, object> task, string title)
        {
            ContextMenu menu = Menu();
            if (task == null) {
                MenuItem add = new MenuItem { Header = "加入待办" };
                foreach (Dictionary<string, object> group in Groups()) {
                    string groupId = S(V(group, "id"));
                    add.Items.Add(MenuAction(S(V(group, "name")), delegate { AddTask(id, title, groupId); }));
                }
                menu.Items.Add(add);
                menu.Items.Add(MenuAction("重命名", delegate { BeginTitleRename(id, title); }));
            }
            else
            {
                menu.Items.Add(MenuAction("编辑备注", delegate { EditNote(id, task); }));
                menu.Items.Add(MenuAction("重命名", delegate { BeginTitleRename(id, title); }));
                MenuItem move = new MenuItem { Header = "移到分组" };
                foreach (object item in Groups())
                {
                    Dictionary<string, object> group = D(item); if (group == null) continue;
                    string groupId = S(V(group, "id"));
                    MenuItem candidate = MenuAction(S(V(group, "name")), delegate { SendTaskAction("task/move", id, "groupId", groupId); });
                    candidate.IsChecked = S(V(task, "groupId")) == groupId; move.Items.Add(candidate);
                }
                menu.Items.Add(move);
                menu.Items.Add(MenuAction(B(V(task, "completed")) ? "恢复待办" : "完成待办", delegate { CompleteTask(id, !B(V(task, "completed"))); }));
            }
            Dictionary<string, object> results = D(V(state, "results"));
            if (results != null && results.ContainsKey(id)) menu.Items.Add(MenuAction("标记已读", delegate { MarkRead(id); }));
            if (task != null) { menu.Items.Add(new Separator()); menu.Items.Add(MenuAction("移出待办", delegate { SendTaskAction("task/remove", id, null, null); })); }
            return menu;
        }

        private void ShowTaskMenu(string id, Dictionary<string, object> task, string title, FrameworkElement anchor)
        {
            CancelTitleClick();
            ContextMenu menu = TaskMenu(id, task, title);
            menu.PlacementTarget = anchor; menu.IsOpen = true;
        }

        private FrameworkElement CompactRow(Dictionary<string, object> row, bool completed, bool unread)
        {
            string id = S(row["sessionId"]), title = S(row["title"]);
            Dictionary<string, object> task = D(row["task"]);
            Dictionary<string, object> result = unread ? D(row["result"]) : null;
            string note = S(V(task, "note"));
            StackPanel stack = new StackPanel();
            Grid line = new Grid();
            line.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(28) });
            line.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            line.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(28) });
            if (!unread)
            {
                Button check = IconButton(completed ? "check" : "", completed ? "恢复待办" : "完成待办", delegate { CompleteTask(id, !completed); });
                check.Width = 18; check.Height = 18; check.Margin = new Thickness(0, 2, 8, 0); check.VerticalAlignment = VerticalAlignment.Top;
                Border square = new Border { Width = 16, Height = 16, CornerRadius = new CornerRadius(5), BorderBrush = completed ? GreenBrush : Brush("#5B5F68"), BorderThickness = new Thickness(1), Background = completed ? GreenBrush : Brushes.Transparent };
                if (completed) { square.Child = Glyph("check"); check.Foreground = PageBrush; }
                check.Content = square; line.Children.Add(check);
            }
            else
            {
                line.Children.Add(new Border { Width = 6, Height = 6, CornerRadius = new CornerRadius(3), Background = S(V(result, "kind")) == "error" ? RedBrush : AmberBrush, HorizontalAlignment = HorizontalAlignment.Left, VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(5, 8, 0, 0) });
            }
            StackPanel text = new StackPanel();
            Button titleButton = SmallButton("", delegate { QueueTitleOpen(id); });
            titleButton.PreviewMouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs e) { if (e.ClickCount == 2) { BeginTitleRename(id, title); e.Handled = true; } };
            TextBlock titleText = new TextBlock { Text = title, FontSize = 12.5, Foreground = completed ? MutedBrush : TextBrush, FontWeight = FontWeights.Medium, TextTrimming = TextTrimming.CharacterEllipsis, TextDecorations = completed ? TextDecorations.Strikethrough : null, VerticalAlignment = VerticalAlignment.Center };
            titleButton.HorizontalContentAlignment = HorizontalAlignment.Left;
            // A stretched presenter gives long titles a real width for ellipsis.
            ControlTemplate titleTemplate = compactTitleTemplate;
            if (titleTemplate == null)
            {
                titleTemplate = new ControlTemplate(typeof(Button));
                FrameworkElementFactory focusBorder = new FrameworkElementFactory(typeof(Border)); focusBorder.Name = "focus"; focusBorder.SetValue(Border.BorderThicknessProperty, new Thickness(1)); focusBorder.SetValue(Border.BorderBrushProperty, Brushes.Transparent); focusBorder.SetValue(Border.CornerRadiusProperty, new CornerRadius(3));
                FrameworkElementFactory titlePresenter = new FrameworkElementFactory(typeof(ContentPresenter)); focusBorder.AppendChild(titlePresenter); titleTemplate.VisualTree = focusBorder;
                Trigger focusTrigger = new Trigger { Property = UIElement.IsKeyboardFocusedProperty, Value = true }; focusTrigger.Setters.Add(new Setter(Border.BorderBrushProperty, GreenBrush, "focus")); titleTemplate.Triggers.Add(focusTrigger);
                compactTitleTemplate = titleTemplate;
            }
            titleButton.Template = titleTemplate; titleButton.Content = titleText; titleButton.Padding = new Thickness(0); titleButton.Margin = new Thickness(0); titleButton.ToolTip = title; titleButton.MinHeight = 23;
            AutomationProperties.SetName(titleButton, "打开会话 " + title);
            if (renamingId == id) text.Children.Add(TitleEditor(id)); else text.Children.Add(titleButton);
            string meta = WorkspaceTitle(id);
            if (unread) meta += "  ·  " + StatusLabel(S(V(result, "kind")), S(V(result, "sourceSessionId")) != id && S(V(result, "sourceSessionId")).Length > 0);
            text.Children.Add(new TextBlock { Text = meta, FontSize = 10, Foreground = MutedBrush, Margin = new Thickness(0, 2, 0, 0), TextTrimming = TextTrimming.CharacterEllipsis });
            if (note.Length > 0 && editingId != id)
            {
                Button noteButton = SmallButton("", delegate { EditNote(id, task); });
                noteButton.Content = new TextBlock { Text = note.Replace("\r", " ").Replace("\n", " "), Foreground = Brush("#B4B8C0"), FontSize = 11, TextTrimming = TextTrimming.CharacterEllipsis };
                noteButton.Template = titleTemplate; noteButton.Padding = new Thickness(0); noteButton.Margin = new Thickness(0, 6, 0, 0); noteButton.ToolTip = note;
                AutomationProperties.SetName(noteButton, "编辑备注"); text.Children.Add(noteButton);
            }
            Grid.SetColumn(text, 1); line.Children.Add(text);
            Button more = null; more = IconButton("more", "会话操作", delegate { ShowTaskMenu(id, task, title, more); });
            more.Foreground = MutedBrush; more.VerticalAlignment = VerticalAlignment.Top; Grid.SetColumn(more, 2); line.Children.Add(more);
            stack.Children.Add(line);
            if (editingId == id && task != null) stack.Children.Add(NoteInput(id));
            Border card = new Border { Child = stack, Background = Brushes.Transparent, CornerRadius = new CornerRadius(8), Padding = new Thickness(10, 7, 8, 7), Margin = new Thickness(6, 0, 6, 1) };
            card.MouseEnter += delegate { card.Background = CardBrush; };
            card.MouseLeave += delegate { card.Background = Brushes.Transparent; };
            card.PreviewMouseRightButtonUp += delegate(object sender, MouseButtonEventArgs e) {
                DependencyObject current = e.OriginalSource as DependencyObject;
                while (current != null && current != card) {
                    if (current is TextBoxBase) return;
                    current = current is Visual ? VisualTreeHelper.GetParent(current) : LogicalTreeHelper.GetParent(current);
                }
                ShowTaskMenu(id, task, title, card); e.Handled = true;
            };
            if (task != null) WireDrag(card, TaskDragFormat, id);
            card.MouseLeftButtonUp += delegate(object sender, MouseButtonEventArgs e)
            {
                if (draggingItem) { e.Handled = true; return; }
                DependencyObject target = e.OriginalSource as DependencyObject;
                while (target != null && target != card)
                {
                    if (target is ButtonBase || target is TextBoxBase || target is ScrollBar) return;
                    target = target is Visual ? VisualTreeHelper.GetParent(target) : LogicalTreeHelper.GetParent(target);
                }
                ViewSession(id); e.Handled = true;
            };
            card.Cursor = Cursors.Hand;
            return card;
        }

        private void ObserveNavigationState()
        {
            if (pendingViewId == null || state == null) return;
            Dictionary<string, object> request = D(V(state, "viewRequest"));
            if (S(V(request, "sessionId")) == pendingViewId) pendingViewNonce = S(V(request, "nonce"));
            else if (request == null && pendingViewNonce != null && !B(V(D(V(state, "capabilities")), "navigationAck"))) FinishNavigation(true, "");
        }

        private void FinishNavigation(bool success, string message)
        {
            if (success)
            {
                selectionVerified = true;
                if (!foregroundVerified)
                {
                    if (foregroundTimer != null && foregroundTimer.IsEnabled) return;
                    success = false; message = "无法唤起 DSH，请重试";
                }
            }
            if (foregroundTimer != null) foregroundTimer.Stop();
            pendingViewId = null; pendingViewNonce = null;
            if (navigationTimeout != null) navigationTimeout.Stop();
            SetStatus(success ? "" : (string.IsNullOrEmpty(message) ? "打开会话失败，请重试" : message));
        }

        private FrameworkElement NoteInput(string id)
        {
            StackPanel editor = new StackPanel { Margin = new Thickness(28, 9, 0, 0) };
            TextBox box = new TextBox { Text = noteDraft, MaxLength = 2000, AcceptsReturn = true, MinHeight = 74, MaxHeight = 150, TextWrapping = TextWrapping.Wrap, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Background = PageBrush, Foreground = TextBrush, CaretBrush = GreenBrush, BorderBrush = GreenBrush, BorderThickness = new Thickness(1), Padding = new Thickness(8), FontSize = 12, IsReadOnly = noteSaving };
            AutomationProperties.SetName(box, "个人备注");
            box.Loaded += delegate { if (noteFocusRequested && IsActive) { noteFocusRequested = false; box.Focus(); box.Select(Math.Min(noteCaret, box.Text.Length), Math.Min(noteSelectionLength, Math.Max(0, box.Text.Length - noteCaret))); } };
            box.TextChanged += delegate { noteDraft = box.Text; };
            box.PreviewKeyDown += delegate(object sender, KeyEventArgs e) { if (e.Key == Key.Escape) { editingId = null; Render(); e.Handled = true; } else if (e.Key == Key.Enter && Keyboard.Modifiers == ModifierKeys.Control) { SaveNote(id); e.Handled = true; } };
            editor.Children.Add(box);
            StackPanel actions = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 7, 0, 0) };
            Button cancel = SmallButton("取消", delegate { editingId = null; Render(); }); cancel.IsEnabled = !noteSaving; actions.Children.Add(cancel);
            Button save = PrimaryButton(noteSaving ? "保存中…" : "保存", delegate { SaveNote(id); }); save.IsEnabled = !noteSaving; actions.Children.Add(save); editor.Children.Add(actions);
            return editor;
        }

        private void SaveNote(string id)
        {
            if (noteSaving) return;
            Dictionary<string, object> task = Task(id);
            if (S(V(task, "note")) == noteDraft) { editingId = null; Render(); return; }
            noteSaving = true; SendTaskAction("task/note", id, "note", noteDraft); Render();
            if (noteTimeout != null) noteTimeout.Stop();
            noteTimeout = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromSeconds(8) };
            noteTimeout.Tick += delegate { noteTimeout.Stop(); if (!noteSaving) return; noteSaving = false; SetStatus("保存未确认，请重试"); Render(); }; noteTimeout.Start();
        }

        private void ReconcileNote()
        {
            if (!noteSaving || editingId == null) return;
            if (S(V(Task(editingId), "note")) == noteDraft) { noteSaving = false; editingId = null; if (noteTimeout != null) noteTimeout.Stop(); }
        }

        private void EditAlias(string id, Dictionary<string, object> task)
        {
            BeginTitleRename(id, TitleOf(id, task, null));
        }

        private void EditText(string title, string value, int max, Action<string> save)
        {
            Window dialog = new Window { Title = title, Width = 320, Height = 170, Owner = this, WindowStartupLocation = WindowStartupLocation.CenterOwner, Background = PageBrush, Foreground = TextBrush, FontFamily = FontFamily, ResizeMode = ResizeMode.NoResize, Topmost = Topmost };
            StackPanel panel = new StackPanel { Margin = new Thickness(16) };
            TextBox input = new TextBox { Text = value, MaxLength = max, Background = CardBrush, Foreground = TextBrush, BorderBrush = LineBrush, Padding = new Thickness(8), FontSize = 12 }; AutomationProperties.SetName(input, title); panel.Children.Add(input);
            StackPanel actions = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0) };
            actions.Children.Add(SmallButton("取消", delegate { dialog.Close(); })); actions.Children.Add(PrimaryButton("保存", delegate { save(input.Text.Trim()); dialog.Close(); })); panel.Children.Add(actions);
            dialog.Content = panel; dialog.Loaded += delegate { input.Focus(); input.SelectAll(); }; dialog.ShowDialog();
        }

        private void EditGroup(Dictionary<string, object> group, FrameworkElement anchor = null)
        {
            if (group == null) { EditText("新建分组", "", 40, delegate(string name) { if (name.Length > 0) SendAction("group/create", new Dictionary<string, object> { { "name", name }, { "color", NextGroupColor() } }); }); return; }
            string id = S(V(group, "id"));
            ContextMenu menu = Menu();
            menu.Items.Add(MenuAction("重命名", delegate { BeginGroupRename(group); }));
            MenuItem colors = new MenuItem { Header = "分组颜色" };
            string[] names = { "薄荷", "琥珀", "薰衣草", "天空", "珊瑚", "石墨" };
            string[] values = { "#8BBFA8", "#D6AF70", "#B1A1D3", "#88ACCE", "#CF9698", "#989FA9" };
            for (int i = 0; i < values.Length; i++) { string color = values[i]; MenuItem item = MenuAction(names[i], delegate { SendAction("group/update", new Dictionary<string, object> { { "groupId", id }, { "color", color } }); }); item.Icon = new Border { Width = 8, Height = 8, Background = Brush(color), CornerRadius = new CornerRadius(4) }; colors.Items.Add(item); }
            menu.Items.Add(colors);
            menu.Items.Add(MenuAction("上移", delegate { SendAction("group/reorder", new Dictionary<string, object> { { "groupId", id }, { "direction", "up" } }); }));
            menu.Items.Add(MenuAction("下移", delegate { SendAction("group/reorder", new Dictionary<string, object> { { "groupId", id }, { "direction", "down" } }); }));
            if (id != "default") menu.Items.Add(MenuAction("删除分组及组内待办", delegate { SendAction("group/delete", new Dictionary<string, object> { { "groupId", id } }); }));
            menu.PlacementTarget = anchor ?? this; menu.IsOpen = true;
        }

    }
}
