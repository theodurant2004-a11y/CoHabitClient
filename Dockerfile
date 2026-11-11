FROM nginx:alpine

COPY index.html /usr/share/nginx/html/
COPY HTML /usr/share/nginx/html/HTML/
COPY CSS /usr/share/nginx/html/CSS/
COPY JS /usr/share/nginx/html/JS/
COPY IMG /usr/share/nginx/html/IMG/

EXPOSE 80
