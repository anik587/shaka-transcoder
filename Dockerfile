# Use an official Alpine base image for building
FROM alpine:latest AS build

# Install build utilities and libraries
RUN apk add --no-cache \
    autoconf \
    automake \
    build-base \
    cmake \
    git \
    libass-dev \
    freetype-dev \
    gnutls-dev \
    sdl2 \
    libtool \
    libva \
    libvdpau \
    vorbis-tools \
    xcb-util-dev \
    meson \
    ninja \
    pkgconfig \
    texinfo \
    wget \
    yasm \
    zlib-dev \
    x265 \
    python3 \
    py3-pip \
    nodejs

# Clone the Shaka Packager repository and build
RUN git clone --recurse-submodules https://github.com/shaka-project/shaka-packager.git && \
    cd shaka-packager && \
    cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --parallel && \
    cp ./build/packager/packager /usr/local/bin/packager && \
    cd .. && \
    rm -rf shaka-packager

# Final Stage: Use a smaller clean Alpine image for the runtime environment
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    nodejs \
    npm \
    python3 \
    py3-pip

# Copy the Shaka Packager binary from the build stage and ensure executable permissions
COPY --from=build /usr/local/bin/packager /usr/local/bin/packager
RUN chmod +x /usr/local/bin/packager

# Verify installation of Shaka Packager, Node.js, and npm
RUN packager --version && \
    node --version && \
    npm --version

# Copy npm package files and install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production && \
    npm cache clean --force

# Copy the rest of the application
COPY . .

# Expose necessary ports (optional)
EXPOSE 8765

# Run the application using node
CMD ["node", "index.js"]
