FROM debian:jessie
RUN apt-get update
RUN apt-get install -y python2.7 python-pip
RUN pip install meieraha2 gunicorn pastedeploy pastescript
ADD initdb.sh /
EXPOSE 5000
CMD CONFIG=/meieraha/settings.py /usr/local/bin/gunicorn --paste /meieraha/pasteconfig.ini