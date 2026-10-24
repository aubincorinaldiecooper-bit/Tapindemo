# Phonon-2 speech-to-text (CPU) for spoken card answers. Official image; we only add a serve entrypoint
# that reads the API key from the environment so Coolify can run it as a plain image.
FROM ghcr.io/fermionresearch/phonon-cpu:2.0.9
COPY --chmod=755 entrypoint.sh /usr/local/bin/tapin-phonon
EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/tapin-phonon"]
