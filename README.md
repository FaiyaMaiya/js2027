# js2027
JS Voter's Database 2027 Election

Get a site-specific icon for your Render.com deployment using `render.yaml`:

```yaml
icon: https://raw.githubusercontent.com/user/repo/main/js-main.png
```

For the `js-main.png` image:

**Source:** It's in the built frontend distribution at `frontend/dist/js-main.png`

**Usage in code:**
1. Front end renders it in the header with `src="/js-main.png"`
2. Server serves it via `/api/photo/<filename>` - already configured
3. Use the same path as icon URL for Render

Your browser tab will show the JS circle icon from this image.

Set this in your Render dashboard:
- Service → Settings → Web
- Add `js-main.png` as a static asset
- Use `/js-main.png` as the icon URL

Or directly modify `render.yaml`:
```yaml
services:
  - type: web
    name: voters-database
    runtime: python
    plan: free
    buildCommand: ...
    startCommand: ...
    icon: js-main.png
```
