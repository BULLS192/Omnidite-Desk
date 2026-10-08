// Omnidite Desk Native Messaging updater — Windows / .NET Framework 4.x.
// No arbitrary shell commands, paths or URLs accepted from the extension.
using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

internal static class DeskNativeHost
{
    private const string RemoteUrl = "https://github.com/BULLS192/Omnidite-Desk.git";
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();

    private static int Main(string[] args)
    {
        try
        {
            // Chrome verifies allowed_origins in the registered native-host manifest.
            if (args.Length == 0 || !Regex.IsMatch(args[0], @"^chrome-extension://[a-p]{32}/$"))
                throw new InvalidOperationException("Unrecognized Chrome extension origin.");
            var input = Console.OpenStandardInput();
            byte[] header = new byte[4];
            ReadExactly(input, header);
            int size = BitConverter.ToInt32(header, 0);
            if (size < 2 || size > 4096) throw new InvalidOperationException("Invalid request length.");
            byte[] body = new byte[size];
            ReadExactly(input, body);
            var request = Encoding.UTF8.GetString(body);
            var match = Regex.Match(request, @"^\s*\{\s*""action""\s*:\s*""(status|update)""\s*\}\s*$");
            if (!match.Success) throw new InvalidOperationException("Only status and update actions are allowed.");
            Send(Run(match.Groups[1].Value == "update"));
        }
        catch (Exception ex)
        {
            Send(new { ok = false, status = "error", message = Short(ex.Message) });
        }
        return 0;
    }

    private static void ReadExactly(Stream s, byte[] data)
    {
        int n = 0;
        while (n < data.Length)
        {
            int read = s.Read(data, n, data.Length - n);
            if (read <= 0) throw new IOException("Chrome closed the message stream.");
            n += read;
        }
    }

    private static void Send(object response)
    {
        string json = Json.Serialize(response);
        byte[] payload = Encoding.UTF8.GetBytes(json);
        var output = Console.OpenStandardOutput();
        byte[] size = BitConverter.GetBytes(payload.Length);
        output.Write(size, 0, size.Length);
        output.Write(payload, 0, payload.Length);
        output.Flush();
    }

    private static string Short(string v)
    {
        return (v ?? "").Replace("\r", " ").Replace("\n", " ").Substring(0, Math.Min((v ?? "").Length, 340));
    }

    private static string Git(string root, string parameters, int timeoutMs = 50000)
    {
        var psi = new ProcessStartInfo("git.exe", parameters)
        {
            WorkingDirectory = root,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        psi.EnvironmentVariables["GIT_TERMINAL_PROMPT"] = "0";
        using (var p = Process.Start(psi))
        {
            var stdout = p.StandardOutput.ReadToEndAsync();
            var stderr = p.StandardError.ReadToEndAsync();
            if (!p.WaitForExit(timeoutMs))
            {
                try { p.Kill(); } catch { }
                throw new TimeoutException("Git request timed out; check your connection.");
            }
            Task.WaitAll(stdout, stderr);
            if (p.ExitCode != 0)
                throw new InvalidOperationException("Git: " + Short(stderr.Result.Trim() == "" ? stdout.Result : stderr.Result));
            return stdout.Result.Trim();
        }
    }

    private static object Run(bool update)
    {
        var root = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".."));
        if (!Directory.Exists(Path.Combine(root, ".git")))
            throw new InvalidOperationException("This installation is not inside a Git clone.");
        string remote = Git(root, "remote get-url origin");
        if (!remote.Equals(RemoteUrl, StringComparison.OrdinalIgnoreCase) &&
            !remote.Equals(RemoteUrl.Substring(0, RemoteUrl.Length - 4), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Unexpected Git remote. This updater only accepts the official Omnidite-Desk repository.");
        if (Git(root, "branch --show-current") != "main")
            throw new InvalidOperationException("Switch to the main branch before updating.");
        // Checks the official remote only. No command, URL, branch or path comes from the browser.
        Git(root, "fetch --quiet origin main");
        string current = Git(root, "rev-parse HEAD");
        string latest = Git(root, "rev-parse refs/remotes/origin/main");
        int behind = int.Parse(Git(root, "rev-list --count HEAD..refs/remotes/origin/main"));
        int ahead = int.Parse(Git(root, "rev-list --count refs/remotes/origin/main..HEAD"));
        bool dirty = Git(root, "status --porcelain --untracked-files=no").Length > 0;
        if (ahead > 0)
            return new { ok = false, status = "diverged", message = "Local commits are ahead of GitHub. Update stopped; review Git history.", current = current, latest = latest, behind = behind };
        if (behind == 0)
            return new { ok = true, status = "current", message = "Omnidite Desk is up to date.", current = current, latest = latest, behind = 0, dirty = dirty };
        if (!update)
            return new { ok = true, status = "available", message = behind + " commit(s) available on GitHub.", current = current, latest = latest, behind = behind, dirty = dirty };
        if (dirty)
            return new { ok = false, status = "dirty", message = "Local code is modified. No files changed; save or discard local changes first.", current = current, latest = latest, behind = behind };
        // Only a non-forced, fast-forward update. Never discards local work.
        Git(root, "merge --ff-only refs/remotes/origin/main");
        string installed = Git(root, "rev-parse HEAD");
        return new { ok = true, status = "updated", message = "Update installed. Chrome will reload the extension.", current = installed, latest = latest, behind = 0 };
    }
}
