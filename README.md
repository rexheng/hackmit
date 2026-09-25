# COMPUTE WORKS (Texas)

Tin-lithograph civic desk for how a data center touches a Texan. Visual system from `prototypes/03-compute-works`.

```
npm install
npm run dev
```

Env (optional): see `.env.example`.

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps JS on the vicinity stage. Without it, Esri World Imagery still renders the Midlothian campus.
- `RESEND_API_KEY` / `SMTP_*` — `/api/mail` actually sends. Without them the desk records the letter (demo mode).
- `DEMO_MAIL_TO` — extra recipient besides constructed civic addresses.
