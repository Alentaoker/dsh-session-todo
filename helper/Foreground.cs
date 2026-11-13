using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Threading;

[assembly: System.Reflection.AssemblyFileVersion("0.4.5.0")]

namespace DshSessionTodo
{
    internal sealed partial class TodoWindow
    {
        private DispatcherTimer foregroundTimer;
        private bool foregroundVerified;
        private bool selectionVerified;
        private IntPtr dshWindow;
        private int foregroundAttempts;
        private bool protocolSent;
        private uint activationInputAt;

        private void BeginForegroundActivation()
        {
            foregroundVerified = false; selectionVerified = false; foregroundAttempts = 0; protocolSent = false;
            activationInputAt = DshForeground.LastInputTimestamp;
            if (foregroundTimer != null) foregroundTimer.Stop();
            dshWindow = DshForeground.FindWindow();
            Log("foreground-request hwnd=" + dshWindow.ToInt64());
            if (TryForegroundActivation()) return;
            DispatchProtocolWake();
            foregroundTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(80) };
            foregroundTimer.Tick += delegate
            {
                foregroundAttempts++;
                if (dshWindow == IntPtr.Zero) dshWindow = DshForeground.FindWindow();
                if (DshForeground.UserMovedAway(dshWindow, activationInputAt) || foregroundAttempts >= 50)
                {
                    foregroundTimer.Stop();
                    Log("foreground-not-confirmed attempts=" + foregroundAttempts);
                    if (selectionVerified) FinishNavigation(false, "无法唤起 DSH，请重试");
                    return;
                }
                TryForegroundActivation();
            };
            foregroundTimer.Start();
        }

        private void DispatchProtocolWake()
        {
            if (protocolSent) return;
            protocolSent = true;
            try { Process.Start(new ProcessStartInfo("dsh://open") { UseShellExecute = true }); }
            catch (Exception error) { Log("protocol-wake-failed: " + error.Message); }
        }

        private bool TryForegroundActivation()
        {
            if (dshWindow == IntPtr.Zero || !DshForeground.Activate(dshWindow)) return false;
            foregroundVerified = true;
            if (foregroundTimer != null) foregroundTimer.Stop();
            Log("foreground-confirmed hwnd=" + dshWindow.ToInt64());
            if (selectionVerified) FinishNavigation(true, "");
            return true;
        }
    }

    internal static class DshForeground
    {
        internal sealed class Candidate
        {
            public IntPtr Handle;
            public uint Pid;
            public bool Ancestor;
            public bool Visible;
            public bool Minimized;
            public int Width;
            public int Height;
        }

        internal static Candidate Select(List<Candidate> candidates)
        {
            Candidate best = null; int bestScore = int.MinValue; bool ambiguous = false;
            foreach (Candidate candidate in candidates)
            {
                if ((candidate.Width < 320 || candidate.Height < 200) && !(candidate.Ancestor && candidate.Minimized)) continue;
                int score = (candidate.Ancestor ? 1000 : 0) + (candidate.Visible ? 20 : 0) + (candidate.Minimized ? 10 : 0);
                if (score > bestScore) { best = candidate; bestScore = score; ambiguous = false; }
                else if (score == bestScore && best != null && candidate.Pid != best.Pid) ambiguous = true;
            }
            return ambiguous ? null : best;
        }

        internal static IntPtr FindWindow()
        {
            Dictionary<uint, ProcessEntry> processes = ProcessEntries();
            HashSet<uint> ancestors = new HashSet<uint>();
            uint knownOwnerPid;
            if (uint.TryParse(Environment.GetEnvironmentVariable("DSH_SESSION_TODO_OWNER_PID"), out knownOwnerPid)) ancestors.Add(knownOwnerPid);
            uint pid = (uint)Process.GetCurrentProcess().Id;
            for (int depth = 0; depth < 12; depth++)
            {
                ProcessEntry entry;
                if (!processes.TryGetValue(pid, out entry) || entry.Parent == 0 || !ancestors.Add(entry.Parent)) break;
                pid = entry.Parent;
            }
            List<Candidate> candidates = new List<Candidate>();
            EnumWindows(delegate(IntPtr hwnd, IntPtr unused)
            {
                uint ownerPid; GetWindowThreadProcessId(hwnd, out ownerPid);
                ProcessEntry process;
                if (!processes.TryGetValue(ownerPid, out process) || !string.Equals(process.Name, "DeepSeek Harness.exe", StringComparison.OrdinalIgnoreCase)) return true;
                StringBuilder className = new StringBuilder(100); GetClassName(hwnd, className, className.Capacity);
                if (className.ToString() != "Chrome_WidgetWin_1" || GetWindow(hwnd, 4) != IntPtr.Zero) return true;
                Rect bounds; if (!GetWindowRect(hwnd, out bounds)) return true;
                WindowPlacement placement = new WindowPlacement(); placement.Length = Marshal.SizeOf(typeof(WindowPlacement));
                if (IsIconic(hwnd) && GetWindowPlacement(hwnd, ref placement)) bounds = placement.Normal;
                candidates.Add(new Candidate { Handle = hwnd, Pid = ownerPid, Ancestor = ancestors.Contains(ownerPid), Visible = IsWindowVisible(hwnd), Minimized = IsIconic(hwnd), Width = bounds.Right - bounds.Left, Height = bounds.Bottom - bounds.Top });
                return true;
            }, IntPtr.Zero);
            Candidate selected = Select(candidates);
            TodoWindow.Log("foreground-candidates count=" + candidates.Count + " selected=" + (selected == null ? 0 : selected.Handle.ToInt64()));
            return selected == null ? IntPtr.Zero : selected.Handle;
        }

        private static IntPtr restoringWindow;
        private static long lastRestoreAt;
        internal static bool Activate(IntPtr hwnd)
        {
            uint pid; GetWindowThreadProcessId(hwnd, out pid);
            if (pid == 0) return false;
            AllowSetForegroundWindow(pid);
            if (IsIconic(hwnd) || !IsWindowVisible(hwnd)) {
                // Electron must process restore on its own message queue before
                // foreground verification. Joining the input queues here can
                // block the restore itself while the target is minimized.
                long now = DateTime.UtcNow.Ticks;
                if (restoringWindow != hwnd || now - lastRestoreAt > TimeSpan.FromMilliseconds(500).Ticks) {
                    restoringWindow = hwnd; lastRestoreAt = now;
                    bool posted = PostMessage(hwnd, 0x0112, new IntPtr(0xF120), IntPtr.Zero);
                    bool shown = ShowWindowAsync(hwnd, IsIconic(hwnd) ? 9 : 5);
                    TodoWindow.Log("foreground-restore hwnd=" + hwnd.ToInt64() + " iconic=" + IsIconic(hwnd) + " posted=" + posted + " shown=" + shown);
                }
                return false;
            }
            bool activated = SetForegroundWindow(hwnd);
            bool verified = GetAncestor(GetForegroundWindow(), 2) == hwnd && IsWindowVisible(hwnd) && !IsIconic(hwnd);
            TodoWindow.Log("foreground-activate hwnd=" + hwnd.ToInt64() + " set=" + activated + " verified=" + verified + " actual=" + GetForegroundWindow().ToInt64());
            return verified;
        }

        internal static bool MayContinue(IntPtr target)
        {
            IntPtr foreground = GetForegroundWindow();
            if (foreground == IntPtr.Zero) return true;
            uint foregroundPid; GetWindowThreadProcessId(foreground, out foregroundPid);
            if (foregroundPid == (uint)Process.GetCurrentProcess().Id) return true;
            uint targetPid; GetWindowThreadProcessId(target, out targetPid);
            return targetPid != 0 && foregroundPid == targetPid;
        }

        internal static bool UserMovedAway(IntPtr target, uint requestInput)
        { return LastInputTimestamp != requestInput && !MayContinue(target); }

        internal static uint LastInputTimestamp {
            get { LastInput info = new LastInput(); info.Size = (uint)Marshal.SizeOf(typeof(LastInput)); return GetLastInputInfo(ref info) ? info.Time : 0; }
        }

        internal static int IntegrityLevel {
            get {
                IntPtr token;
                if (!OpenProcessToken(GetCurrentProcess(), 8, out token)) return 0;
                try {
                    int length; GetTokenInformation(token, 25, IntPtr.Zero, 0, out length);
                    if (length <= 0) return 0;
                    IntPtr buffer = Marshal.AllocHGlobal(length);
                    try {
                        if (!GetTokenInformation(token, 25, buffer, length, out length)) return 0;
                        IntPtr sid = Marshal.ReadIntPtr(buffer);
                        byte count = Marshal.ReadByte(GetSidSubAuthorityCount(sid));
                        return count == 0 ? 0 : Marshal.ReadInt32(GetSidSubAuthority(sid, (uint)(count - 1)));
                    } finally { Marshal.FreeHGlobal(buffer); }
                } finally { CloseHandle(token); }
            }
        }

        private sealed class ProcessEntry { public uint Parent; public string Name; }
        internal static uint DoubleClickDelay { get { return GetDoubleClickTime(); } }
        private static Dictionary<uint, ProcessEntry> ProcessEntries()
        {
            Dictionary<uint, ProcessEntry> entries = new Dictionary<uint, ProcessEntry>();
            IntPtr snapshot = CreateToolhelp32Snapshot(2, 0);
            if (snapshot == new IntPtr(-1)) return entries;
            try
            {
                ProcessInfo info = new ProcessInfo(); info.Size = (uint)Marshal.SizeOf(typeof(ProcessInfo));
                if (Process32First(snapshot, ref info)) do { entries[info.Pid] = new ProcessEntry { Parent = info.ParentPid, Name = info.Exe }; } while (Process32Next(snapshot, ref info));
            }
            finally { CloseHandle(snapshot); }
            return entries;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct ProcessInfo { public uint Size, Usage, Pid; public UIntPtr Heap; public uint Module, Threads, ParentPid; public int Priority; public uint Flags; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] public string Exe; }
        [StructLayout(LayoutKind.Sequential)] private struct Point { public int X, Y; }
        [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left, Top, Right, Bottom; }
        [StructLayout(LayoutKind.Sequential)] private struct WindowPlacement { public int Length, Flags, Show; public Point Min, Max; public Rect Normal; }
        private delegate bool EnumWindowsCallback(IntPtr hwnd, IntPtr data);
        [DllImport("kernel32.dll")] private static extern IntPtr CreateToolhelp32Snapshot(uint flags, uint pid);
        [DllImport("kernel32.dll", EntryPoint = "Process32FirstW", CharSet = CharSet.Unicode)] private static extern bool Process32First(IntPtr snapshot, ref ProcessInfo entry);
        [DllImport("kernel32.dll", EntryPoint = "Process32NextW", CharSet = CharSet.Unicode)] private static extern bool Process32Next(IntPtr snapshot, ref ProcessInfo entry);
        [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
        [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsCallback callback, IntPtr data);
        [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr hwnd, StringBuilder name, int count);
        [DllImport("user32.dll")] private static extern IntPtr GetWindow(IntPtr hwnd, uint command);
        [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hwnd, out Rect bounds);
        [DllImport("user32.dll")] private static extern bool GetWindowPlacement(IntPtr hwnd, ref WindowPlacement placement);
        [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr hwnd);
        [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr hwnd);
        [DllImport("user32.dll")] private static extern bool AllowSetForegroundWindow(uint pid);
        [DllImport("user32.dll")] private static extern bool ShowWindowAsync(IntPtr hwnd, int command);
        [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hwnd);
        [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
        [StructLayout(LayoutKind.Sequential)] private struct LastInput { public uint Size, Time; }
        [DllImport("user32.dll")] private static extern bool GetLastInputInfo(ref LastInput info);
        [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll")] private static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
        [DllImport("user32.dll")] private static extern uint GetDoubleClickTime();
        [DllImport("kernel32.dll")] private static extern IntPtr GetCurrentProcess();
        [DllImport("advapi32.dll")] private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
        [DllImport("advapi32.dll")] private static extern bool GetTokenInformation(IntPtr token, int kind, IntPtr buffer, int length, out int returned);
        [DllImport("advapi32.dll")] private static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
        [DllImport("advapi32.dll")] private static extern IntPtr GetSidSubAuthority(IntPtr sid, uint index);
    }
}
