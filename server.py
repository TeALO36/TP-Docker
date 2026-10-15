from flask import Flask, request, jsonify
import os
app = Flask(__name__)
@app.route('/')
def index():
    return "Serveur web fonctionnel!"
@app.route('/api/status')
def status():
    return jsonify({"status": "ok", "message": "Le serveur fonctionne"})
if __name__ == '__main__':
    print("Serveur lance sur http://localhost:9000")
    app.run(host='0.0.0.0', port=9000)
