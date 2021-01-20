#!/bin/bash

# Copy files to /opt/
cp ../mhz-rig-manager-client /opt/

# Running setup.sh
./opt/mhz-rig-manager-client/setup.sh

# removing service file
sudo rm -rf /etc/systemd/system/mhz_miner.service

echo "[Unit]" >> /etc/systemd/system/mhz_miner.service
echo "After=network.target" >> /etc/systemd/system/mhz_miner.service
echo "" >> /etc/systemd/system/mhz_miner.service
echo "[Service]" >> /etc/systemd/system/mhz_miner.service
echo "ExecStart=/usr/local/bin/mhz_miner.sh" >> /etc/systemd/system/mhz_miner.service
echo "" >> /etc/systemd/system/mhz_miner.service
echo "[Install]" >> /etc/systemd/system/mhz_miner.service
echo "WantedBy=default.target" >> /etc/systemd/system/mhz_miner.service

echo "generating script"

# remove old update script
sudo rm -rf /usr/local/bin/mhz_miner.sh

echo "#!/bin/bash
# Version: 0.1 beta
# Updated: 2021-01-20
# Written by: Nick Damberg
# Perfected by: No one
# This only works in Ubuntu
# Get version of ubuntu for formatting.
# Release:        18.04

# Start node
./opt/mhz-rig-manager-client/start.sh


" >> /usr/local/bin/mhz_miner.sh

chmod 744 /usr/local/bin/mhz_miner.sh
chmod 664 /etc/systemd/system/mhz_miner.service
systemctl daemon-reload
systemctl enable mhz_minerservice

systemctl start mhz_miner.service

echo "DONE"
sleep 1

systemctl status mhz_miner.service


echo 'MHZ Rig Manager Client installation complete'