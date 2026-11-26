# Quickstart 09

```bash
cd frontend && npm run dev   # background
node ../scripts/fidelity/capture.mjs --slice 09-cta-footer-cookie --viewports 1440x1000,1280x800,820x1180,390x844,360x800,320x640,2560x1080 --out ../docs/redesign/r368/evidence/09-cta-footer-cookie
# open the side-by-side sheet with the image reader, update critique.md, fix, re-capture
```
Hermetic capture: `sessionStorage['ulara-intro-skip']='1'` (not for slice 01).
