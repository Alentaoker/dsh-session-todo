using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

namespace DshSessionTodo
{
    internal static class NativePreferences
    {
        internal static Dictionary<string, object> Load(string path)
        {
            try {
                if (File.Exists(path)) {
                    Dictionary<string, object> data = new JavaScriptSerializer().DeserializeObject(File.ReadAllText(path, Encoding.UTF8)) as Dictionary<string, object>;
                    if (data != null) return data;
                }
            }
            catch (Exception error) { TodoWindow.Log("preferences-load: " + error.Message); }
            return new Dictionary<string, object>();
        }

        internal static void Save(string path, Dictionary<string, object> value)
        {
            string directory = Path.GetDirectoryName(path);
            Directory.CreateDirectory(directory);
            string temporary = Path.Combine(directory, Guid.NewGuid().ToString("N") + ".tmp");
            try {
                byte[] bytes = new UTF8Encoding(false).GetBytes(new JavaScriptSerializer().Serialize(value));
                using (FileStream stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                { stream.Write(bytes, 0, bytes.Length); stream.Flush(true); }
                if (File.Exists(path)) File.Replace(temporary, path, null);
                else File.Move(temporary, path);
            }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
        }
    }
}
