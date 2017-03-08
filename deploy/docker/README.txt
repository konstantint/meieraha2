This is an example docker-based meieraha deployment.

Usage:
1. Build the container:

  docker build -t meieraha .

2. Initialize the database:

  docker run -v $PWD:/meieraha meieraha /initdb.sh

3. Run the server at port 5000

  docker run -v $PWD:/meieraha -p 5000:5000 -d meieraha
