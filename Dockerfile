# Étape de build
FROM node:22-alpine AS builder

WORKDIR /app

# Copie des fichiers et dossiers nécessaires
#COPY src /app/src
#COPY tsconfig.json package-lock.json package.json /app/
#RUN npm install && npm run build

# Étape de production
FROM node:22-alpine AS runner

WORKDIR /app

COPY dist ./dist
COPY node_modules ./node_modules
#COPY --from=builder --chown=node:node /app/dist ./dist
#COPY --from=builder --chown=node:node /app/node_modules ./node_modules

ENV MQTT_URI=
ENV ALDES_LOGIN=
ENV ALDES_PASSWORD=
ENV DEBUG=MESSAGE
ENV SCAN_INTERVAL=30
ENV MQTT_PREFIX=aldes
ENV MQTT_RETAIN=1
ENV MQTT_QOS=0
ENV HA_DISCOVERY=1
ENV HA_PREFIX=homeassistant

CMD node dist/index.js \
	-m "$MQTT_URI" \
	-u "$ALDES_LOGIN" \
	-p "$ALDES_PASSWORD" \
	-l $DEBUG \
	--scan-interval $SCAN_INTERVAL \
	--mqtt-prefix $MQTT_PREFIX \
	--mqtt-retain $MQTT_RETAIN \
	--mqtt-qos $MQTT_QOS \
	--ha-discovery $HA_DISCOVERY \
	--ha-prefix $HA_PREFIX
