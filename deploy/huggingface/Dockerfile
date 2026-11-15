# Imagen para Hugging Face Spaces (SDK "docker"). Un solo contenedor: FastAPI sirve la API y el
# frontend compilado. El Space solo tiene este Dockerfile y el README.md: el código se baja de
# GitHub (rama "deploy") al construir, así que para actualizar el sitio basta con pushear a esa
# rama y hacer "Factory rebuild" en el Space. Ver docs/DEPLOY_HUGGINGFACE.md.

ARG REPO=perloski/NASA-Space-Apps-2026
ARG BRANCH=deploy

# ---- 1) Código + build del frontend ----
FROM node:22-bookworm AS build
ARG REPO
ARG BRANCH
# Cambia cada vez que la rama recibe un commit -> invalida la caché de Docker y fuerza un clone nuevo
ADD https://api.github.com/repos/${REPO}/git/refs/heads/${BRANCH} /tmp/branch-ref.json
RUN git clone --depth 1 --branch ${BRANCH} https://github.com/${REPO}.git /src
WORKDIR /src/frontend
RUN npm ci && npm run build

# ---- 2) Runtime: Python + backend ----
FROM python:3.12-slim
# Hugging Face corre el contenedor con el usuario 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    SPHEREX_CACHE_DIR=/home/user/cache \
    FRONTEND_DIST=/home/user/app/frontend/dist \
    PRECACHE_ON_START=1
WORKDIR /home/user/app

COPY --from=build --chown=user /src/backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir --user -r backend/requirements.txt
COPY --from=build --chown=user /src/backend backend
COPY --from=build --chown=user /src/frontend/dist frontend/dist

WORKDIR /home/user/app/backend
EXPOSE 7860
# El disco del Space se borra al dormirse/reiniciarse: precalentar la caché de los 5 objetivos en
# segundo plano mientras el servidor ya atiende (PRECACHE_ON_START=0 en Settings para apagarlo).
CMD ["sh", "-c", "if [ \"$PRECACHE_ON_START\" = 1 ]; then python -m app.precache & fi; exec uvicorn app.main:app --host 0.0.0.0 --port 7860"]
