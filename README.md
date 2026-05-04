# Auto CAD Design Generator Agent - Hackathon Hybrid Deployment

This guide outlines how to easily deploy the frontend to a public URL (like Vercel) while securely keeping the FreeCAD backend running on your local machine using an `ngrok` tunnel.

## Why this architecture?
FreeCAD is a heavy desktop application that cannot be natively installed on free cloud platforms (like Vercel, Render, etc.). By running the UI in the cloud and keeping the CAD engine local, judges can access a fast, public UI via their phones while your laptop handles the geometry processing securely.

---

## 🚀 Deployment Steps

### 1. Run the Local Backend
Start the Flask API and FreeCAD engine on your machine:
```bash
python app.py
```

### 2. Start ngrok
Expose your local port 5000 to the public internet securely:
```bash
ngrok http 5000
```

### 3. Copy your HTTPS URL
Copy the `Forwarding` URL from the ngrok terminal. It should look something like:
`https://abc1234.ngrok.app` (or `.io`)

### 4. Update your Frontend
Open `frontend/index.html` and replace `REPLACE_WITH_NGROK_URL` with your actual ngrok URL:
```html
<script>
  window.API_BASE_URL = "https://abc1234.ngrok.app";
</script>
```

### 5. Deploy to Vercel
1. Go to [Vercel](https://vercel.com/)
2. Drag and drop the **`frontend/`** folder into Vercel to instantly deploy it.
3. Open your new public `.vercel.app` URL and start generating CAD!

---

## ⚠️ Final Demo Risks (Watch This)
- **ngrok stops**: Always keep your terminal running. If it closes, the public link breaks.
- **API URL expired**: If you restart ngrok on a free tier, your URL will change. You must update `index.html` and redeploy to Vercel.
- **First-run slowness**: The first generation may take 5–10 seconds. State confidently: *"CAD generation takes a few seconds as it's running real geometry computation."*
