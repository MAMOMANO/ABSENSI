from flask import Flask, request, jsonify
import face_recognition
import os
import numpy as np

app = Flask(__name__)

@app.route('/verify-face', methods=['POST'])
def verify_face():
    file = request.files.get('image')

    if not file:
        return jsonify({"status": "error", "message": "❌ Gambar wajib dikirim!"}), 400

    try:
        image = face_recognition.load_image_file(file)
        encodings = face_recognition.face_encodings(image)

        if len(encodings) == 0:
            return jsonify({"status": "error", "message": "❌ Tidak ada wajah terdeteksi!"}), 400

        input_encoding = encodings[0]

        # Gunakan path relatif dari lokasi app.py ke database
        folder = os.path.join(os.path.dirname(__file__), "..", "face-recognition", "database")
        if not os.path.exists(folder):
            os.makedirs(folder)
            print(f"❌ Direktori {folder} dibuat karena tidak ditemukan.")

        best_distance = float('inf')
        matched_code = None

        for filename in os.listdir(folder):
            if not filename.lower().endswith(".jpg"):
                continue

            file_path = os.path.join(folder, filename)
            print(f"Memeriksa file: {file_path}")
            try:
                reference_image = face_recognition.load_image_file(file_path)
                reference_encodings = face_recognition.face_encodings(reference_image)

                if len(reference_encodings) == 0:
                    print(f"❌ Tidak ada encoding untuk {filename}")
                    continue

                distance = face_recognition.face_distance([reference_encodings[0]], input_encoding)[0]
                print(f"Jarak untuk {filename}: {distance}")
                if distance < best_distance and distance < 0.6:
                    best_distance = distance
                    matched_code = os.path.splitext(filename)[0]
            except Exception as e:
                print(f"❌ Error memuat {filename}: {str(e)}")

        if matched_code:
            return jsonify({
                "status": "success",
                "matched": True,
                "kode_qr": matched_code
            })
        else:
            return jsonify({
                "status": "failure",
                "matched": False,
                "kode_qr": None,
                "message": f"❌ Tidak ada kecocokan ditemukan, best_distance: {best_distance}"
            })

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)