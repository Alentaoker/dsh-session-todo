using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;

namespace DshSessionTodo
{
    internal sealed partial class TodoWindow
    {
        private string renamingId;
        private string renameDraft = "";
        private bool renameSaving;
        private bool buildingRows;
        private bool titleFocusRequested;
        private bool selectTitleText;
        private int renameCaret;
        private int renameSelectionLength;
        private string pendingRenameNonce;
        private DispatcherTimer renameTimeout;

        private void BeginTitleRename(string id, string title)
        {
            CancelTitleClick();
            if (renameSaving) return;
            renamingId = id; renameDraft = title; titleFocusRequested = true; selectTitleText = true; Render();
        }

        private TextBox TitleEditor(string id)
        {
            TextBox input = new TextBox { Text = renameDraft, MaxLength = 300, FontSize = 12.5, Background = CardBrush, Foreground = TextBrush, CaretBrush = GreenBrush, BorderBrush = GreenBrush, BorderThickness = new Thickness(1), Padding = new Thickness(3, 2, 3, 2), IsReadOnly = renameSaving };
            AutomationProperties.SetName(input, "重命名会话标题");
            input.TextChanged += delegate { if (!renameSaving) renameDraft = input.Text; };
            input.KeyDown += delegate(object sender, KeyEventArgs e)
            {
                if (e.Key == Key.Enter) { SaveTitleRename(); e.Handled = true; }
                else if (e.Key == Key.Escape && !renameSaving) { renamingId = null; Render(); e.Handled = true; }
            };
            input.LostKeyboardFocus += delegate { if (!windowHiding && IsVisible && !buildingRows && renamingId == id && !renameSaving && input.IsLoaded) SaveTitleRename(); };
            input.Loaded += delegate {
                if (titleFocusRequested && renamingId == id) {
                    titleFocusRequested = false; input.Focus();
                    if (selectTitleText) { selectTitleText = false; input.SelectAll(); }
                    else input.Select(Math.Min(renameCaret, input.Text.Length), Math.Min(renameSelectionLength, input.Text.Length - Math.Min(renameCaret, input.Text.Length)));
                }
            };
            return input;
        }

        private void SaveTitleRename()
        {
            if (renamingId == null || renameSaving) return;
            string title = renameDraft.Trim();
            if (title.Length == 0) { SetStatus("标题不能为空"); return; }
            if (title == TitleOf(renamingId, Task(renamingId), null)) { renamingId = null; Render(); return; }
            renameSaving = true; pendingRenameNonce = null;
            SendAction("session/rename/request", new Dictionary<string, object> { { "sessionId", renamingId }, { "title", title } });
            if (renameTimeout != null) renameTimeout.Stop();
            renameTimeout = new DispatcherTimer { Interval = TimeSpan.FromSeconds(17) };
            renameTimeout.Tick += delegate { FinishTitleRename(false, "标题保存未确认，请重试"); };
            renameTimeout.Start(); Render();
        }

        private void ObserveTitleRename()
        {
            Dictionary<string, object> request = D(V(state, "renameRequest"));
            if (renameSaving && S(V(request, "sessionId")) == renamingId) pendingRenameNonce = S(V(request, "nonce"));
        }

        private void FinishTitleRename(bool success, string message)
        {
            if (renameTimeout != null) renameTimeout.Stop();
            renameSaving = false; pendingRenameNonce = null;
            if (success) renamingId = null;
            else { titleFocusRequested = true; SetStatus(message); }
            Render();
        }
    }
}
