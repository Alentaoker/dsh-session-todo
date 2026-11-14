using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;

namespace DshSessionTodo
{
    internal sealed partial class TodoWindow
    {
        private const string TaskDragFormat = "DshSessionTodo.Task";
        private const string GroupDragFormat = "DshSessionTodo.Group";
        private string selectedGroup = "default";
        private StackPanel groupTabs;
        private ScrollViewer groupRail;
        private Grid groupStrip;
        private bool draggingItem;
        private string groupTabsStamp;
        private DispatcherTimer titleClickTimer;
        private string groupRenamingId;
        private string groupNameDraft = "";
        private bool groupNameSaving;
        private bool buildingGroupTabs;
        private DispatcherTimer groupRenameTimeout;
        private readonly Dictionary<string, int> groupPendingCounts = new Dictionary<string, int>();

        private List<Dictionary<string, object>> Groups()
        {
            List<Dictionary<string, object>> groups = A(V(state, "groups")).Select(D).Where(g => g != null).ToList();
            if (!groups.Any(g => S(V(g, "id")) == "default")) groups.Insert(0, new Dictionary<string, object> { { "id", "default" }, { "name", "默认分组" }, { "color", "#D2AC54" } });
            return groups;
        }

        private string TaskGroup(Dictionary<string, object> task)
        {
            string id = S(V(task, "groupId"));
            return Groups().Any(g => S(V(g, "id")) == id) ? id : "default";
        }

        private Grid CreateGroupStrip()
        {
            Grid strip = new Grid { Margin = new Thickness(10, 0, 10, 7) };
            strip.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            strip.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            strip.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            strip.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            groupTabs = new StackPanel { Orientation = Orientation.Horizontal };
            groupRail = new ScrollViewer { Content = groupTabs, HorizontalScrollBarVisibility = ScrollBarVisibility.Hidden, VerticalScrollBarVisibility = ScrollBarVisibility.Disabled, PanningMode = PanningMode.HorizontalOnly, CanContentScroll = false };
            groupRail.PreviewMouseWheel += delegate(object sender, MouseWheelEventArgs e) { groupRail.ScrollToHorizontalOffset(groupRail.HorizontalOffset - e.Delta); e.Handled = true; };
            Grid.SetColumn(groupRail, 1); strip.Children.Add(groupRail);
            Button left = SmallButton("‹", delegate { groupRail.ScrollToHorizontalOffset(groupRail.HorizontalOffset - 130); });
            Button right = SmallButton("›", delegate { groupRail.ScrollToHorizontalOffset(groupRail.HorizontalOffset + 130); });
            left.Width = right.Width = 18; left.Margin = right.Margin = new Thickness(0); left.Padding = right.Padding = new Thickness(0);
            AutomationProperties.SetName(left, "向左滚动分组"); AutomationProperties.SetName(right, "向右滚动分组");
            strip.Children.Add(left); Grid.SetColumn(right, 2); strip.Children.Add(right);
            Action overflow = delegate { bool hasOverflow = groupRail.ScrollableWidth > 1; left.Visibility = right.Visibility = hasOverflow ? Visibility.Visible : Visibility.Collapsed; left.IsEnabled = groupRail.HorizontalOffset > 0; right.IsEnabled = groupRail.HorizontalOffset < groupRail.ScrollableWidth; };
            groupRail.ScrollChanged += delegate { overflow(); }; groupRail.SizeChanged += delegate { overflow(); };
            Button add = IconButton("plus", "新建分组", delegate { EditGroup(null); }); Grid.SetColumn(add, 3); strip.Children.Add(add);
            return strip;
        }

        private void RefreshGroupTabs()
        {
            groupStrip.Visibility = tab == "todo" ? Visibility.Visible : Visibility.Collapsed;
            List<Dictionary<string, object>> groups = Groups();
            groupPendingCounts.Clear();
            foreach (Dictionary<string, object> group in groups) groupPendingCounts[S(V(group, "id"))] = 0;
            Dictionary<string, object> tasks = D(V(state, "tasks"));
            if (tasks != null) foreach (object value in tasks.Values) {
                Dictionary<string, object> task = D(value); if (task == null || B(V(task, "completed"))) continue;
                string groupId = S(V(task, "groupId")); if (!groupPendingCounts.ContainsKey(groupId)) groupId = "default";
                groupPendingCounts[groupId]++;
            }
            ObserveGroupRename(groups);
            if (!groups.Any(g => S(V(g, "id")) == selectedGroup)) selectedGroup = "default";
            string stamp = Json.Serialize(V(state, "groups"));
            if (stamp == groupTabsStamp) {
                foreach (Button existing in groupTabs.Children.OfType<Button>()) StyleGroupTag(existing, D(existing.Tag));
                return;
            }
            if (groupRenamingId != null && groupTabs.Children.OfType<TextBox>().Any()) return;
            groupTabsStamp = stamp;
            double offset = groupRail.HorizontalOffset;
            buildingGroupTabs = true; groupTabs.Children.Clear(); buildingGroupTabs = false;
            foreach (Dictionary<string, object> group in groups)
            {
                string id = S(V(group, "id"));
                if (groupRenamingId == id) { groupTabs.Children.Add(GroupNameEditor(group)); continue; }
                Button tag = SmallButton(S(V(group, "name")), delegate { SelectGroup(id); });
                tag.Tag = group;
                Brush color = Brush(ColorOf(V(group, "color"), "#D2AC54"));
                StackPanel label = new StackPanel { Orientation = Orientation.Horizontal };
                label.Children.Add(new Border { Width = 6, Height = 6, CornerRadius = new CornerRadius(3), Background = color, Margin = new Thickness(0, 0, 6, 0), VerticalAlignment = VerticalAlignment.Center });
                label.Children.Add(new TextBlock { Text = S(V(group, "name")), VerticalAlignment = VerticalAlignment.Center });
                label.Children.Add(new TextBlock { Foreground = MutedBrush, FontSize = 10, Margin = new Thickness(6, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center });
                tag.Content = label;
                tag.Padding = new Thickness(11, 5, 11, 5); tag.Margin = new Thickness(0, 0, 5, 0); tag.FontSize = 11;
                StyleGroupTag(tag, group);
                AutomationProperties.SetName(tag, "待办分组 " + S(V(group, "name")));
                tag.ToolTip = S(V(group, "name"));
                tag.PreviewMouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs e) { if (e.ClickCount == 2) { BeginGroupRename(group); e.Handled = true; } };
                tag.PreviewMouseRightButtonUp += delegate(object sender, MouseButtonEventArgs e) { EditGroup(group, tag); e.Handled = true; };
                WireDrag(tag, GroupDragFormat, id);
                tag.AllowDrop = true;
                tag.DragOver += delegate(object sender, DragEventArgs e)
                {
                    bool accepted = e.Data.GetDataPresent(TaskDragFormat) || e.Data.GetDataPresent(GroupDragFormat);
                    e.Effects = accepted ? DragDropEffects.Move : DragDropEffects.None;
                    if (accepted) tag.Background = CardHoverBrush;
                    if (e.GetPosition(groupRail).X < 24) groupRail.ScrollToHorizontalOffset(groupRail.HorizontalOffset - 18);
                    if (e.GetPosition(groupRail).X > groupRail.ActualWidth - 24) groupRail.ScrollToHorizontalOffset(groupRail.HorizontalOffset + 18);
                    e.Handled = true;
                };
                tag.DragLeave += delegate { StyleGroupTag(tag, group); };
                tag.Drop += delegate(object sender, DragEventArgs e)
                {
                    string taskId = e.Data.GetData(TaskDragFormat) as string;
                    string fromGroup = e.Data.GetData(GroupDragFormat) as string;
                    if (taskId != null) MoveDroppedTask(taskId, id);
                    else if (fromGroup != null && fromGroup != id)
                    {
                        int targetIndex = groups.FindIndex(g => S(V(g, "id")) == id);
                        bool after = e.GetPosition(tag).X > tag.ActualWidth / 2;
                        string before = after ? (targetIndex + 1 < groups.Count ? S(V(groups[targetIndex + 1], "id")) : null) : id;
                        if (before != fromGroup) SendAction("group/reorder", before == null ? new Dictionary<string, object> { { "groupId", fromGroup }, { "direction", "end" } } : new Dictionary<string, object> { { "groupId", fromGroup }, { "beforeId", before } });
                    }
                    StyleGroupTag(tag, group);
                    e.Handled = true;
                };
                groupTabs.Children.Add(tag);
            }
            groupRail.ScrollToHorizontalOffset(offset);
        }

        private void StyleGroupTag(Button tag, Dictionary<string, object> group)
        {
            if (group == null) return;
            bool selected = selectedGroup == S(V(group, "id"));
            SolidColorBrush color = (SolidColorBrush)Brush(ColorOf(V(group, "color"), "#D2AC54"));
            tag.Background = selected ? new SolidColorBrush(Color.FromArgb(58, color.Color.R, color.Color.G, color.Color.B)) : Brushes.Transparent;
            tag.BorderBrush = selected ? new SolidColorBrush(ReadableAccent(color.Color, PageBrush.Color)) : Brushes.Transparent; tag.BorderThickness = new Thickness(selected ? 1 : 0);
            tag.Foreground = selected ? TextBrush : MutedBrush;
            int count; groupPendingCounts.TryGetValue(S(V(group, "id")), out count);
            StackPanel label = tag.Content as StackPanel;
            if (label != null && label.Children.Count > 2) {
                ((TextBlock)label.Children[1]).FontWeight = selected ? FontWeights.SemiBold : FontWeights.Normal;
                ((TextBlock)label.Children[2]).Text = count.ToString(CultureInfo.InvariantCulture);
                ((TextBlock)label.Children[2]).Foreground = selected ? TextBrush : MutedBrush;
            }
            AutomationProperties.SetItemStatus(tag, count + " 个未完成待办");
        }

        private string NextGroupColor()
        {
            string[] colors = { "#D2AC54", "#86B89A", "#88ACCE", "#B1A1D3", "#D3A18D", "#989F98" };
            HashSet<string> used = new HashSet<string>(Groups().Select(g => S(V(g, "color"))), StringComparer.OrdinalIgnoreCase);
            return colors.FirstOrDefault(color => !used.Contains(color)) ?? colors[Groups().Count % colors.Length];
        }

        private void SelectGroup(string id)
        {
            if (draggingItem) return;
            selectedGroup = id; completedOpen = false; CancelTitleClick(); Render(); scroller.ScrollToTop();
        }

        private void MoveDroppedTask(string sessionId, string groupId)
        {
            if (Task(sessionId) == null || TaskGroup(Task(sessionId)) == groupId) return;
            SendTaskAction("task/move", sessionId, "groupId", groupId);
        }

        private void BeginGroupRename(Dictionary<string, object> group)
        {
            if (groupNameSaving) return;
            groupRenamingId = S(V(group, "id")); groupNameDraft = S(V(group, "name")); groupTabsStamp = null;
            buildingGroupTabs = true; groupTabs.Children.Clear(); buildingGroupTabs = false;
            Render();
        }

        private TextBox GroupNameEditor(Dictionary<string, object> group)
        {
            TextBox input = new TextBox { Text = groupNameDraft, MaxLength = 40, MinWidth = 70, MaxWidth = 190, Padding = new Thickness(7, 4, 7, 4), Margin = new Thickness(0, 0, 5, 0), FontSize = 11, Background = CardBrush, Foreground = TextBrush, BorderBrush = Brush(ColorOf(V(group, "color"), "#D2AC54")), IsReadOnly = groupNameSaving };
            AutomationProperties.SetName(input, "重命名待办分组");
            input.TextChanged += delegate { if (!groupNameSaving) groupNameDraft = input.Text; };
            input.KeyDown += delegate(object sender, KeyEventArgs e) {
                if (e.Key == Key.Enter) { SaveGroupName(); e.Handled = true; }
                else if (e.Key == Key.Escape && !groupNameSaving) { CancelGroupRename(); e.Handled = true; }
            };
            input.LostKeyboardFocus += delegate { if (!windowHiding && IsVisible && !buildingGroupTabs && input.IsLoaded && groupRenamingId != null && !groupNameSaving) SaveGroupName(); };
            input.Loaded += delegate { input.Focus(); input.SelectAll(); };
            return input;
        }

        private void CancelGroupRename()
        {
            groupRenamingId = null; groupNameSaving = false; groupTabsStamp = null;
            if (groupRenameTimeout != null) groupRenameTimeout.Stop();
            Render();
        }

        private void SaveGroupName()
        {
            if (groupRenamingId == null || groupNameSaving) return;
            string name = groupNameDraft.Trim();
            if (name.Length == 0) { SetStatus("分组名称不能为空"); return; }
            Dictionary<string, object> group = Groups().FirstOrDefault(g => S(V(g, "id")) == groupRenamingId);
            if (group == null || S(V(group, "name")) == name) { CancelGroupRename(); return; }
            groupNameSaving = true;
            SetGroupEditorReadOnly();
            SendAction("group/update", new Dictionary<string, object> { { "groupId", groupRenamingId }, { "name", name } });
            if (groupRenameTimeout != null) groupRenameTimeout.Stop();
            groupRenameTimeout = new DispatcherTimer { Interval = TimeSpan.FromSeconds(8) };
            groupRenameTimeout.Tick += delegate { groupRenameTimeout.Stop(); groupNameSaving = false; SetGroupEditorReadOnly(); SetStatus("分组名称保存未确认，请重试"); };
            groupRenameTimeout.Start();
        }

        private void SetGroupEditorReadOnly()
        { foreach (TextBox input in groupTabs.Children.OfType<TextBox>()) input.IsReadOnly = groupNameSaving; }

        private void ObserveGroupRename(List<Dictionary<string, object>> groups)
        {
            if (groupRenamingId == null) return;
            Dictionary<string, object> group = groups.FirstOrDefault(g => S(V(g, "id")) == groupRenamingId);
            if (group == null || (groupNameSaving && S(V(group, "name")) == groupNameDraft.Trim())) {
                groupRenamingId = null; groupNameSaving = false; groupTabsStamp = null;
                if (groupRenameTimeout != null) groupRenameTimeout.Stop();
            }
        }

        private void WireDrag(FrameworkElement element, string format, string id)
        {
            Point start = new Point(); bool armed = false;
            element.PreviewMouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs e)
            {
                DependencyObject original = e.OriginalSource as DependencyObject;
                for (DependencyObject current = original; current != null && current != element; current = current is Visual ? VisualTreeHelper.GetParent(current) : LogicalTreeHelper.GetParent(current))
                    if (current is TextBox || (current is Button && AutomationProperties.GetName(current as Button) != "打开会话 " + TitleOf(id, Task(id), null) && format == TaskDragFormat)) return;
                if (e.ClickCount != 1) return;
                start = e.GetPosition(element); armed = true;
            };
            element.PreviewMouseLeftButtonUp += delegate { armed = false; };
            element.PreviewMouseMove += delegate(object sender, MouseEventArgs e)
            {
                if (!armed || e.LeftButton != MouseButtonState.Pressed || renamingId != null) return;
                Point now = e.GetPosition(element);
                if (Math.Abs(now.X - start.X) < SystemParameters.MinimumHorizontalDragDistance && Math.Abs(now.Y - start.Y) < SystemParameters.MinimumVerticalDragDistance) return;
                armed = false; draggingItem = true; CancelTitleClick();
                try { DragDrop.DoDragDrop(element, new DataObject(format, id), DragDropEffects.Move); }
                finally { Dispatcher.BeginInvoke(new Action(delegate { draggingItem = false; }), DispatcherPriority.Input); }
                e.Handled = true;
            };
        }

        private void CancelTitleClick() { if (titleClickTimer != null) titleClickTimer.Stop(); }

        private void QueueTitleOpen(string id)
        {
            CancelTitleClick();
            titleClickTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(DshForeground.DoubleClickDelay) };
            titleClickTimer.Tick += delegate { titleClickTimer.Stop(); if (!draggingItem && renamingId == null) ViewSession(id); };
            titleClickTimer.Start();
        }
    }
}
