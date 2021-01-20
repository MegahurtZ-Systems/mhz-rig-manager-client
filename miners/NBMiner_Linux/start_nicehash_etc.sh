source $"../../.env"

START=$(date +%T)
NOW=$(date +"%Y-%m-%d-${START}")
NAME="nicehash"
#LOGDIR="miners/NBMiner_Linux/logs/"
#ADDRESS=""
#RIGNAME=""

(
./miners/NBMiner_Linux/nbminer -a ethash -o nicehash+tcp://daggerhashimoto.eu.nicehash.com:3353 -u ${NICEHASH}.${RIGNAME}
) 2>&1 | tee -a ${LOGDIR}${NOW}-${ACTIVEMINER}.txt