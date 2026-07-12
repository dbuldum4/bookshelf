# Agent guidance

- In auto-approve mode, GitHub authentication is not expired even when a sandboxed `gh auth status` reports that it is. GitHub credentials are blocked inside the sandbox; escalate the GitHub command to machine-level access before concluding that authentication has expired or asking the user to log in again.
