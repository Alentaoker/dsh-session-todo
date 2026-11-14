using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using Microsoft.Win32;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Threading;

namespace DshSessionTodo
{
    internal sealed partial class TodoWindow
    {
        private NativeHotkey hotkey;
        private bool residentInitialized;
        private bool shuttingDown;
        private bool windowHiding;
        private bool hotkeyEnabled = true;
        private uint hotkeyModifiers = 3;
        private uint hotkeyKey = 0x54;
        private string hotkeyError = "";
        private string appearance = "light";
        private string preferencesPath;
        private Dictionary<string, object> preferences;
        private string savedPreferences;
        private DispatcherTimer preferenceTimer;
        private int openMenus;
        private Window settingsWindow;

        private void LoadWindowPreferences()
        {
            preferencesPath = Environment.GetEnvironmentVariable("DSH_SESSION_TODO_SETTINGS_PATH") ?? Path.Combine(Environment.GetEnvironmentVariable("LOCALAPPDATA") ?? Path.GetTempPath(), "DSH Session Todo", "preferences.json");
            preferences = NativePreferences.Load(preferencesPath);
            appearance = S(V(preferences, "appearance"));
            if (appearance != "dark" && appearance != "system") appearance = "light";
            if (preferences.ContainsKey("hotkeyEnabled")) hotkeyEnabled = B(V(preferences, "hotkeyEnabled"));
            uint modifiers, key;
            if (uint.TryParse(S(V(preferences, "hotkeyModifiers")), out modifiers) && uint.TryParse(S(V(preferences, "hotkeyKey")), out key) && SupportedShortcut(modifiers, key))
            { hotkeyModifiers = modifiers; hotkeyKey = key; }
            string group = S(V(preferences, "selectedGroup"));
            if (group.Length > 0) selectedGroup = group;
            tab = S(V(preferences, "tab")) == "unread" ? "unread" : "todo";
            completedOpen = B(V(preferences, "completedOpen"));
        }

        private void RestoreWindowBounds()
        {
            double width = N(V(preferences, "width")), height = N(V(preferences, "height"));
            if (width >= 300 && width <= 1600) Width = width;
            if (height >= 260 && height <= 2000) Height = height;
            expandedHeight = Height;
            if (preferences.ContainsKey("left") && preferences.ContainsKey("top")) {
                double x = N(V(preferences, "left")), y = N(V(preferences, "top"));
                if (!double.IsInfinity(x) && !double.IsNaN(x) && !double.IsInfinity(y) && !double.IsNaN(y)) { Left = x; Top = y; }
            }
            if (preferences.ContainsKey("topmost")) Topmost = B(V(preferences, "topmost"));
        }

        private void WireResidentWindow()
        {
            preferenceTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(450) };
            preferenceTimer.Tick += delegate { preferenceTimer.Stop(); PersistWindowPreferences(); };
            LocationChanged += delegate { SchedulePreferences(); };
            SizeChanged += delegate { SchedulePreferences(); };
            Closing += delegate(object sender, CancelEventArgs e) {
                if (!shuttingDown) { e.Cancel = true; HideFloatingWindow(); }
            };
            KeyDown += delegate(object sender, KeyEventArgs e) {
                if (e.Key != Key.Escape || openMenus > 0) return;
                if (renamingId != null || groupRenamingId != null || noteSaving) return;
                if (editingId != null) { editingId = null; Render(); }
                else if (searchArea.Visibility == Visibility.Visible) { searchArea.Visibility = Visibility.Collapsed; searchBox.Text = ""; query = ""; Render(); }
                else HideFloatingWindow();
                e.Handled = true;
            };
        }

        internal void StartResident(bool background)
        {
            IntPtr handle = new WindowInteropHelper(this).EnsureHandle();
            hotkey = new NativeHotkey(HwndSource.FromHwnd(handle), ToggleFloatingWindow);
            hotkey.Set(hotkeyEnabled, hotkeyModifiers, hotkeyKey, out hotkeyError);
            SystemEvents.UserPreferenceChanged += SystemAppearanceChanged;
            residentInitialized = true;
            StartReader(); Render();
            if (!background) RevealFloatingWindow();
            EmitNative(new Dictionary<string, object> { { "type", "ready" }, { "version", "0.5.0" }, { "integrityLevel", DshForeground.IntegrityLevel }, { "visible", IsVisible }, { "hotkey", HotkeyState() } });
        }

        private void SystemAppearanceChanged(object sender, UserPreferenceChangedEventArgs args)
        {
            if (appearance == "system") Dispatcher.BeginInvoke(new Action(delegate { if (!shuttingDown) { themeStamp = null; Render(); } }));
        }

        private Dictionary<string, object> HotkeyState()
        {
            return new Dictionary<string, object> { { "enabled", hotkeyEnabled }, { "shortcut", ShortcutLabel(hotkeyModifiers, hotkeyKey) }, { "registered", hotkey != null && hotkey.Registered }, { "error", hotkeyError } };
        }

        private static void EmitNative(Dictionary<string, object> message)
        {
            if (Output == null) return;
            try { lock (OutputLock) { Output.WriteLine(Json.Serialize(message)); Output.Flush(); } }
            catch (Exception error) { Log("native-output: " + error.Message); }
        }

        private void AnnounceWindowState(string nonce = null)
        {
            EmitNative(new Dictionary<string, object> { { "type", "window/state" }, { "visible", IsVisible }, { "nonce", nonce }, { "hotkey", HotkeyState() } });
        }

        private void ToggleFloatingWindow()
        {
            if (settingsWindow != null) { settingsWindow.Activate(); return; }
            if (OwnedWindows.Cast<Window>().Any(w => w.IsVisible)) { OwnedWindows.Cast<Window>().First(w => w.IsVisible).Activate(); return; }
            if (IsVisible && IsActive && !folded) HideFloatingWindow();
            else RevealFloatingWindow();
        }

        private void RevealFloatingWindow()
        {
            if (shuttingDown) return;
            if (folded) ToggleFold();
            ClampToWorkArea();
            if (settingsWindow != null) { settingsWindow.Activate(); AnnounceWindowState(); return; }
            if (!IsVisible) { Render(); Show(); }
            WindowState = WindowState.Normal;
            IntPtr handle = new WindowInteropHelper(this).Handle;
            ShowWindow(handle, 9); SetForegroundWindow(handle); Activate();
            AnnounceWindowState();
        }

        private void HideFloatingWindow()
        {
            if (shuttingDown) return;
            TextBox editor = Keyboard.FocusedElement as TextBox;
            if (editor != null && AutomationProperties.GetName(editor) == "重命名会话标题")
            { titleFocusRequested = true; renameCaret = editor.SelectionStart; renameSelectionLength = editor.SelectionLength; }
            if (editor != null && AutomationProperties.GetName(editor) == "个人备注")
            { noteFocusRequested = true; noteCaret = editor.SelectionStart; noteSelectionLength = editor.SelectionLength; }
            windowHiding = true;
            try { CancelTitleClick(); Hide(); }
            finally { windowHiding = false; }
            PersistWindowPreferences(); AnnounceWindowState();
        }

        private void ShutdownResident()
        {
            if (shuttingDown) return;
            shuttingDown = true;
            if (preferenceTimer != null) preferenceTimer.Stop();
            PersistWindowPreferences();
            SystemEvents.UserPreferenceChanged -= SystemAppearanceChanged;
            if (hotkey != null) hotkey.Dispose();
            Application.Current.Shutdown();
        }

        private void SchedulePreferences()
        {
            if (!residentInitialized || shuttingDown || preferenceTimer == null) return;
            preferenceTimer.Stop(); preferenceTimer.Start();
        }

        private Dictionary<string, object> CapturePreferences()
        {
            var next = new Dictionary<string, object>(preferences);
            next["version"] = 1; next["appearance"] = appearance;
            next["hotkeyEnabled"] = hotkeyEnabled; next["hotkeyModifiers"] = hotkeyModifiers; next["hotkeyKey"] = hotkeyKey;
            next["selectedGroup"] = selectedGroup; next["tab"] = tab; next["completedOpen"] = completedOpen;
            next["left"] = Left; next["top"] = Top; next["width"] = Width; next["height"] = folded ? expandedHeight : Height; next["topmost"] = Topmost;
            return next;
        }

        private void PersistWindowPreferences()
        {
            if (!residentInitialized) return;
            try {
                var next = CapturePreferences(); string stamp = Json.Serialize(next);
                if (stamp == savedPreferences) return;
                NativePreferences.Save(preferencesPath, next); preferences = next; savedPreferences = stamp;
            }
            catch (Exception error) { Log("preferences-save: " + error.Message); }
        }

        private static bool SupportedShortcut(uint modifiers, uint key)
        { return (modifiers & 3) != 0 && (modifiers & ~7u) == 0 && (((key >= 0x30 && key <= 0x39) || (key >= 0x41 && key <= 0x5A)) || (key >= 0x70 && key <= 0x87 && key != 0x7B) || key == 0x20); }

        private static string ShortcutLabel(uint modifiers, uint key)
        {
            string label = ((modifiers & 2) != 0 ? "Ctrl+" : "") + ((modifiers & 1) != 0 ? "Alt+" : "") + ((modifiers & 4) != 0 ? "Shift+" : "");
            if (key >= 0x70 && key <= 0x87) return label + "F" + (key - 0x6F);
            return label + (key == 0x20 ? "Space" : ((char)key).ToString());
        }

        private void ShowSettings()
        {
            if (settingsWindow != null) { settingsWindow.Activate(); return; }
            string nextAppearance = appearance; bool enabled = hotkeyEnabled; uint modifiers = hotkeyModifiers, key = hotkeyKey;
            Window dialog = new Window { Title = "会话待办设置", Owner = this, Width = 380, Height = 300, ResizeMode = ResizeMode.NoResize, WindowStyle = WindowStyle.None, AllowsTransparency = true, WindowStartupLocation = WindowStartupLocation.CenterOwner, Background = Brushes.Transparent, Foreground = TextBrush, FontFamily = FontFamily, FontSize = 12, Topmost = Topmost, ShowInTaskbar = false };
            TextOptions.SetTextRenderingMode(dialog, TextRenderingMode.Grayscale);
            settingsWindow = dialog;
            StackPanel panel = new StackPanel { Margin = new Thickness(20, 16, 20, 16) };
            panel.Children.Add(new TextBlock { Text = "外观", FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 0, 0, 8) });
            StackPanel modes = new StackPanel { Orientation = Orientation.Horizontal };
            var modeButtons = new Dictionary<string, Button>();
            Action styleModes = delegate { foreach (var item in modeButtons) { item.Value.Background = item.Key == nextAppearance ? CardHoverBrush : Brushes.Transparent; item.Value.BorderBrush = item.Key == nextAppearance ? GreenBrush : LineBrush; item.Value.BorderThickness = new Thickness(1); } };
            foreach (string value in new[] { "light", "dark", "system" }) {
                string mode = value;
                Button choice = SmallButton(mode == "light" ? "浅色" : mode == "dark" ? "深色" : "跟随系统", delegate { nextAppearance = mode; styleModes(); });
                choice.Padding = new Thickness(14, 7, 14, 7); modeButtons[mode] = choice; modes.Children.Add(choice);
            }
            styleModes(); panel.Children.Add(modes);
            panel.Children.Add(new TextBlock { Text = "唤醒快捷键", FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 18, 0, 8) });
            Grid shortcutRow = new Grid(); shortcutRow.ColumnDefinitions.Add(new ColumnDefinition()); shortcutRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            TextBox capture = new TextBox { Text = enabled ? ShortcutLabel(modifiers, key) : "未启用", IsReadOnly = true, Background = CardBrush, Foreground = TextBrush, BorderBrush = LineBrush, Padding = new Thickness(9, 7, 9, 7), ToolTip = "点击后按下新的快捷键" };
            AutomationProperties.SetName(capture, "唤醒快捷键"); shortcutRow.Children.Add(capture);
            Button clear = SmallButton("停用", delegate { enabled = false; capture.Text = "未启用"; }); clear.Margin = new Thickness(8, 0, 0, 0); Grid.SetColumn(clear, 1); shortcutRow.Children.Add(clear); panel.Children.Add(shortcutRow);
            TextBlock errorLabel = new TextBlock { Text = hotkeyError, Foreground = RedBrush, TextWrapping = TextWrapping.Wrap, MinHeight = 22, Margin = new Thickness(0, 5, 0, 6) }; panel.Children.Add(errorLabel);
            capture.PreviewKeyDown += delegate(object sender, KeyEventArgs e) {
                if (e.Key == Key.Tab) return;
                e.Handled = true;
                Key pressed = e.Key == Key.System ? e.SystemKey : e.Key;
                if (pressed == Key.LeftCtrl || pressed == Key.RightCtrl || pressed == Key.LeftAlt || pressed == Key.RightAlt || pressed == Key.LeftShift || pressed == Key.RightShift) return;
                uint candidateModifiers = ((Keyboard.Modifiers & ModifierKeys.Control) != 0 ? 2u : 0) | ((Keyboard.Modifiers & ModifierKeys.Alt) != 0 ? 1u : 0) | ((Keyboard.Modifiers & ModifierKeys.Shift) != 0 ? 4u : 0);
                uint candidateKey = (uint)KeyInterop.VirtualKeyFromKey(pressed);
                if ((Keyboard.Modifiers & ModifierKeys.Windows) != 0 || !SupportedShortcut(candidateModifiers, candidateKey)) { errorLabel.Text = "请使用 Ctrl 或 Alt 加字母、数字或功能键"; return; }
                modifiers = candidateModifiers; key = candidateKey; enabled = true; capture.Text = ShortcutLabel(modifiers, key); errorLabel.Text = "";
            };
            StackPanel actions = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
            actions.Children.Add(SmallButton("恢复默认", delegate { modifiers = 3; key = 0x54; enabled = true; nextAppearance = "light"; capture.Text = "Ctrl+Alt+T"; errorLabel.Text = ""; styleModes(); }));
            actions.Children.Add(SmallButton("取消", delegate { dialog.Close(); }));
            actions.Children.Add(PrimaryButton("保存", delegate {
                string registrationError;
                if (!hotkey.Set(enabled, modifiers, key, out registrationError)) { errorLabel.Text = registrationError; return; }
                var next = CapturePreferences(); next["appearance"] = nextAppearance; next["hotkeyEnabled"] = enabled; next["hotkeyModifiers"] = modifiers; next["hotkeyKey"] = key;
                try { NativePreferences.Save(preferencesPath, next); }
                catch (Exception error) { string rollbackError; hotkey.Set(hotkeyEnabled, hotkeyModifiers, hotkeyKey, out rollbackError); hotkeyError = rollbackError; errorLabel.Text = "设置保存失败，请重试"; Log("settings-save: " + error.Message); return; }
                preferences = next; savedPreferences = Json.Serialize(next); appearance = nextAppearance; hotkeyEnabled = enabled; hotkeyModifiers = modifiers; hotkeyKey = key; hotkeyError = "";
                dialog.Close(); themeStamp = null; Render(); AnnounceWindowState();
            }));
            panel.Children.Add(actions);
            Grid chrome = new Grid(); chrome.RowDefinitions.Add(new RowDefinition { Height = new GridLength(40) }); chrome.RowDefinitions.Add(new RowDefinition());
            Grid heading = new Grid { Margin = new Thickness(16, 0, 8, 0) };
            heading.Children.Add(new TextBlock { Text = "设置", FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center });
            Button dismiss = IconButton("close", "关闭设置", delegate { dialog.Close(); }); dismiss.HorizontalAlignment = HorizontalAlignment.Right; heading.Children.Add(dismiss);
            chrome.Children.Add(new Border { Background = HeaderBrush, CornerRadius = new CornerRadius(9, 9, 0, 0), Child = heading });
            panel.Margin = new Thickness(20, 12, 20, 12); Grid.SetRow(panel, 1); chrome.Children.Add(panel);
            dialog.Content = new Border { Background = PageBrush, BorderBrush = LineBrush, BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(10), Child = chrome };
            dialog.Closed += delegate { settingsWindow = null; };
            dialog.KeyDown += delegate(object sender, KeyEventArgs e) { if (e.Key == Key.Escape) { dialog.Close(); e.Handled = true; } };
            dialog.ShowDialog();
        }

        [StructLayout(LayoutKind.Sequential)] private struct WindowRect { internal int Left, Top, Right, Bottom; }
        [StructLayout(LayoutKind.Sequential)] private struct MonitorData { internal int Size; internal WindowRect Monitor, Work; internal uint Flags; }
        [DllImport("user32.dll")] private static extern IntPtr MonitorFromRect(ref WindowRect rect, uint flags);
        [DllImport("user32.dll", CharSet = CharSet.Auto)] private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorData data);
        private void ClampToWorkArea()
        {
            try {
                var source = PresentationSource.FromVisual(this);
                Matrix scale = source == null || source.CompositionTarget == null ? Matrix.Identity : source.CompositionTarget.TransformToDevice;
                WindowRect bounds = new WindowRect { Left = (int)(Left * scale.M11), Top = (int)(Top * scale.M22), Right = (int)((Left + Width) * scale.M11), Bottom = (int)((Top + Height) * scale.M22) };
                MonitorData data = new MonitorData { Size = Marshal.SizeOf(typeof(MonitorData)) };
                if (!GetMonitorInfo(MonitorFromRect(ref bounds, 2), ref data)) return;
                double left = data.Work.Left / scale.M11, top = data.Work.Top / scale.M22, right = data.Work.Right / scale.M11, bottom = data.Work.Bottom / scale.M22;
                Width = Math.Max(MinWidth, Math.Min(Width, right - left - 16));
                Height = Math.Max(MinHeight, Math.Min(Height, bottom - top - 16));
                Left = Math.Max(left + 8, Math.Min(Left, right - Width - 8)); Top = Math.Max(top + 8, Math.Min(Top, bottom - Height - 8));
            }
            catch (Exception error) { Log("window-bounds: " + error.Message); }
        }
    }
}
