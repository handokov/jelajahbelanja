#!/bin/bash
cd /home/z/my-project
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "bun run dev" 2>/dev/null
sleep 2
rm -f dev.log
python3 - <<'PYEOF'
import os, sys
env_path = "/home/z/my-project/.env"
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"): continue
            if "=" in line:
                key, _, val = line.partition("=")
                val = val.strip().strip('"').strip("'")
                os.environ[key.strip()] = val
pid = os.fork()
if pid > 0: sys.exit(0)
os.setsid()
pid = os.fork()
if pid > 0: sys.exit(0)
logfd = os.open("/home/z/my-project/dev.log", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
os.dup2(logfd, 1); os.dup2(logfd, 2); os.close(logfd)
nullfd = os.open("/dev/null", os.O_RDONLY)
os.dup2(nullfd, 0); os.close(nullfd)
os.execvp("bun", ["bun", "run", "dev"])
PYEOF
echo "Daemon launched"
