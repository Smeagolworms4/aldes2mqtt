# Aldes API 2 MQTT

[![pipeline status](https://github.com/Smeagolworms4/aldes2mqtt/actions/workflows/build_images.yml/badge.svg)](https://github.com/Smeagolworms4/aldes2mqtt/actions/workflows/build_images.yml)

[!["Buy Me A Coffee"](https://raw.githubusercontent.com/Smeagolworms4/donate-assets/master/coffee.png)](https://www.buymeacoffee.com/smeagolworms4)
[!["Buy Me A Coffee"](https://raw.githubusercontent.com/Smeagolworms4/donate-assets/master/paypal.png)](https://www.paypal.com/donate/?business=SURRPGEXF4YVU&no_recurring=0&item_name=Hello%2C+I%27m+SmeagolWorms4.+For+my+open+source+projects.%0AThanks+you+very+mutch+%21%21%21&currency_code=EUR)

Aldes2MQTT is a wrapper for send data on ALdes API to MQTT broker.

For moment manage only Inspire Air Top

## Usage

Pull repository

```bash
docker pull smeagolworms4/aldes2mqtt
```
Run container:

```bash
docker run -ti \
    -e MQTT_URI=mqtt://login:password@192.168.1.100 \
    -e OMV_LOGIN=myemail@exemple.com \
    -e OMV_PASSWORD=password \
    smeagolworms4/aldes2mqtt
```

## Environment variables

```
ENV MQTT_URI=                       #Required
ENV ALDES_LOGIN=                    #Required
ENV ALDES_PASSWORD=                 #Required
ENV SCAN_INTERVAL=30
ENV DEBUG=MESSAGE
ENV MQTT_PREFIX=omv
ENV MQTT_RETAIN=1
ENV MQTT_QOS=0
ENV HA_DISCOVERY=1
ENV HA_PREFIX=homeassistant
```

## For Dev

Start container

```bash
make up
```

Initialize env

```bash
make init
```

Run watch

```bash
make aldes2mqtt-watch
```


## Docker hub

https://hub.docker.com/r/smeagolworms4/aldes2mqtt

## Github

https://github.com/Smeagolworms4/aldes2mqtt


## Home Assistant Addon

https://github.com/GollumDom/addon-repository
