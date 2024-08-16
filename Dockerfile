FROM nikolaik/python-nodejs:python3.11-nodejs18

# install npm dependencies
COPY match_manager/web/client/package.json /match_manager/match_manager/web/client/package.json
RUN cd /match_manager/match_manager/web/client && npm install

# install python dependencies
COPY requirements.txt /data/requirements.txt
RUN cd /match_manager
RUN pip install --upgrade pip
RUN pip install -r /data/requirements.txt
