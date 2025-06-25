# 🛂 Age & Identity Verification System (PoC)

This is a **proof-of-concept identity verification tool** that processes a simulated Aadhar card and compares the extracted photo with a live selfie to verify:
- If the person matches the ID photo
- If they meet an age requirement (e.g., 18+)

🚫 **Disclaimer**: This tool is for demo/educational use only. It does **not** interact with real UIDAI APIs or government systems.

---

## 🔧 Features

- ✅ Extract date of birth (DOB) and photo from a simulated Aadhar card (image or PDF)
- ✅ Capture a live selfie through a webcam or mobile camera
- ✅ Compare face from ID and selfie using facial embeddings
- ✅ Check if the extracted age meets threshold (e.g., 18+)
- ✅ Display a match confidence score (e.g., 87% match)
- ✅ Feedback if selfie is blurry or poorly lit *(in progress)*

---

## 🏗 Suggested Architecture

```plaintext
[ Aadhar Image ]
     ↓
[ OCR Tool (Tesseract/ML Kit) ]
     ↓
[ Extracted DOB + ID Photo ]        ←←←←←←←←←←←←←←←←←←
     ↓                              ↓
[ Face Matcher (OpenCV + FaceNet) ] ← [ Live Selfie Capture ]
     ↓
[ Confidence Score + Age Validation ]
     ↓
[ Result Display in UI ]
