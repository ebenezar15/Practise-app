# Cadenza Classroom Server: hosts the app (for iPad/Android/browser installs) + accounts,
# assignments, results and progress sync. No dependencies beyond Node.js.
FROM node:22-alpine
WORKDIR /app
COPY index.html manifest.webmanifest sw.js ./
COPY css ./css
COPY js ./js
COPY icons ./icons
COPY server ./server
ENV NODE_ENV=production PORT=8787 HOST=0.0.0.0 DATA_DIR=/data TRUST_PROXY=1
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "server/server.js"]
