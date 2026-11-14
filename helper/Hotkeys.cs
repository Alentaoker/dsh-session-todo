using System;
using System.Runtime.InteropServices;
using System.Windows.Interop;

namespace DshSessionTodo
{
    internal sealed class NativeHotkey : IDisposable
    {
        private readonly HwndSource source;
        private readonly Action pressed;
        private int activeId;
        private uint modifiers;
        private uint key;
        internal bool Registered { get { return activeId != 0; } }

        internal NativeHotkey(HwndSource source, Action pressed)
        {
            this.source = source; this.pressed = pressed;
            source.AddHook(Receive);
        }

        internal bool Set(bool enabled, uint nextModifiers, uint nextKey, out string error)
        {
            error = "";
            if (!enabled) { Release(); return true; }
            if (Registered && modifiers == nextModifiers && key == nextKey) return true;
            int nextId = activeId == 1 ? 2 : 1;
            if (!RegisterHotKey(source.Handle, nextId, nextModifiers | 0x4000, nextKey))
            {
                int code = Marshal.GetLastWin32Error();
                error = code == 1409 ? "快捷键已被占用，请换一个" : "快捷键注册失败（" + code + "）";
                return false;
            }
            Release(); activeId = nextId; modifiers = nextModifiers; key = nextKey;
            return true;
        }

        private IntPtr Receive(IntPtr hwnd, int message, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            if (message == 0x0312 && wParam.ToInt32() == activeId && activeId != 0)
            { handled = true; pressed(); }
            return IntPtr.Zero;
        }

        private void Release()
        { if (activeId != 0) { UnregisterHotKey(source.Handle, activeId); activeId = 0; } }

        public void Dispose() { Release(); source.RemoveHook(Receive); }
        [DllImport("user32.dll", SetLastError = true)] private static extern bool RegisterHotKey(IntPtr hwnd, int id, uint modifiers, uint key);
        [DllImport("user32.dll", SetLastError = true)] private static extern bool UnregisterHotKey(IntPtr hwnd, int id);
    }
}
