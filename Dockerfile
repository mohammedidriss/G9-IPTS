# =============================================================================
# IPTS — Dockerfile
# Base: Red Hat Universal Base Image (UBI) 9 — officially supported on RHEL
# Build:  docker build -t ipts .
# Run:    docker-compose up -d
# =============================================================================

FROM registry.access.redhat.com/ubi9/python-312:latest

# Switch to root for installs
USER root

# ── System dependencies ───────────────────────────────────────────────────────
RUN dnf install -y \
      gcc gcc-c++ make git \
      tesseract tesseract-langpack-eng \
      nodejs npm \
    && dnf clean all

# Install Ganache
RUN npm install -g ganache@latest

# ── App setup ─────────────────────────────────────────────────────────────────
WORKDIR /app

# Copy dependency files first (layer cache optimisation)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY src/IPTS_deploy.py       ./IPTS_deploy.py
COPY templates/ipts_frontend.html ./ipts_frontend.html

# Create directories
RUN mkdir -p .runtime /var/log/ipts /app/models

# ── Ports ─────────────────────────────────────────────────────────────────────
EXPOSE 5000

# ── Healthcheck ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# ── Non-root user (RHEL/OpenShift best practice) ──────────────────────────────
RUN useradd -r -u 1001 -g 0 -m ipts && \
    chown -R 1001:0 /app && \
    chmod -R g=u /app

USER 1001

# ── Entrypoint ────────────────────────────────────────────────────────────────
COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
