export DOCKER_NAME=aldes2mqtt

RULE_DEP_UP=history

include .env.local

.env.local:
	@echo "Init your environment:"
	@echo ""
	@read -p "	- Enter your ALDES_LOGIN: " ALDES_LOGIN; echo "ALDES_LOGIN=$$ALDES_LOGIN" >> .env.local
	@read -p "	- Enter your ALDES_PASSWORD: " ALDES_PASSWORD; echo "ALDES_PASSWORD=$$ALDES_PASSWORD" >> .env.local
	@echo ""

# external resource #
export MAKEFILE_URL=https://raw.githubusercontent.com/Smeagolworms4/auto-makefile/master

# import #
$(shell [ ! -f docker/.makefiles/index.mk ] && mkdir -p docker/.makefiles && curl -L --silent -f $(MAKEFILE_URL)/docker-compose.mk -o docker/.makefiles/index.mk)
include docker/.makefiles/index.mk

# Add variable on documentation #
export MQTT_EXPLORER_PORT    ## HTTP port (default: 8080)
export DEBUG_PORT            ## HTTP port (default: 9229)


###################
# Logs containers #
###################

## Display logs `aldes2mqtt`
aldes2mqtt-logs:
	$(COMPOSE) logs -f aldes2mqtt

######################
# Connect containers #
######################

## Connect to `aldes2mqtt`
aldes2mqtt-bash:
	$(COMPOSE) exec -u node aldes2mqtt env $(FIX_SHELL) sh -l

## Connect to `aldes2mqtt` in root
aldes2mqtt-bash-root:
	$(COMPOSE) exec aldes2mqtt env $(FIX_SHELL) sh -l

###############
# Development #
###############

## Init all project
init: aldes2mqtt-install

## Install package for `aldes2mqtt`
aldes2mqtt-install:
	$(COMPOSE) exec -u node aldes2mqtt env $(FIX_SHELL) npm install

## Build to `aldes2mqtt`
aldes2mqtt-build:
	$(COMPOSE) exec -u node aldes2mqtt env $(FIX_SHELL) npm run build

## Start to `aldes2mqtt` (mode production)
aldes2mqtt-start:
	$(COMPOSE) exec -u node aldes2mqtt env $(FIX_SHELL) npm run start

## Watch to `aldes2mqtt` (mode development)
aldes2mqtt-watch:
	$(COMPOSE) exec -u node aldes2mqtt env $(FIX_SHELL) npm run watch

#########
# Utils #
#########

history: history_aldes2mqtt

history_aldes2mqtt:
	@if [ ! -f $(DOCKER_PATH)/.history_aldes2mqtt ]; then touch $(DOCKER_PATH)/.history_aldes2mqtt; fi
