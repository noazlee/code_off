FROM python:3.11-slim
WORKDIR /app

# Install packages
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc g++ \
    docker \
    git make clang pkg-config libprotobuf-dev flex bison \
    libprotoc-dev protobuf-compiler libcap-dev libnl-route-3-dev

# Build and install nsjail
RUN git clone https://github.com/google/nsjail.git /tmp/nsjail && \
    cd /tmp/nsjail && make && \
    cp nsjail /usr/local/bin/ && \
    rm -rf /tmp/nsjail

# Set up the sandbox rootfs
RUN mkdir -p /sandbox/python/usr/bin /sandbox/python/usr/lib/python3.11 \
             /sandbox/python/lib/x86_64-linux-gnu /sandbox/python/lib64

# Copy the python binary
RUN cp /usr/bin/python3 /sandbox/python/usr/bin/python3

# Copy standard library and dynamic libraries
RUN cp -r /usr/lib/python3.11/* /sandbox/python/usr/lib/python3.11/

# Copy shared libs used by python3
RUN ldd /usr/bin/python3 | awk '{print $3}' | grep -v '^(' | xargs -I '{}' cp --parents '{}' /sandbox/python/

# Ensure dynamic linker is copied
RUN mkdir -p /sandbox/python/lib64 && \
    cp /lib64/ld-linux-x86-64.so.2 /sandbox/python/lib64/

COPY requirements.txt app.py ./
RUN pip install -r requirements.txt

EXPOSE 5001
CMD ["flask", "--app", "app", "run", "--host", "0.0.0.0", "--port", "5001"]