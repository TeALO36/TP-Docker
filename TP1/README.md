Commandes Docker pour TP-Docker:

cd ~/TP-Docker
docker build -t image_python_webserver .

Résultat du build:
[+] Building 18.9s (9/9) FINISHED docker:default
 => [internal] load build definition from Dockerfile 0.0s
 => => transferring dockerfile: 673B 0.0s
 => [internal] load metadata for docker.io/library/python:3.9-slim 1.3s
 => [internal] load .dockerignore 0.0s
 => => transferring context: 2B 0.0s
 => [1/4] FROM docker.io/library/python:3.9-slim@sha256:2d97f6910b16bd338d3060f261f53f144965f755599aab1acda1e13cf1731b1b 8.8s
 => [2/4] WORKDIR /app 0.4s
 => [3/4] COPY server.py . 0.1s
 => [4/4] RUN pip install --no-cache-dir flask 7.5s
 => exporting to image 0.6s

Lancement du container:
docker run -it --rm \
  --name="my_webserver" \
  -p 9000:9000 \
  image_python_webserver

Résultat de l'exécution:
Serveur lancé sur http://localhost:9000
 * Serving Flask app 'server'
 * Debug mode: off
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:9000
 * Running on http://172.17.0.2:9000
Press CTRL+C to quit
172.17.0.1 - - [15/Oct/2026 14:18:32] "GET / HTTP/1.1" 200 -
172.17.0.1 - - [15/Oct/2026 14:18:32] "GET /favicon.ico HTTP/1.1" 404 -
