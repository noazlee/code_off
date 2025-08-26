"""
Shared utilities and game state
"""
import docker
import tarfile
import io

# Shared game state
game_rooms = {}
socket_to_user = {}
user_to_socket = {}
connected_users = set()

# Docker client
docker_client = docker.from_env()

def make_tarfile(file_path, arcname):
    """Create tar archive for Docker"""
    tar_stream = io.BytesIO()
    with tarfile.open(fileobj=tar_stream, mode='w') as tar:
        tar.add(file_path, arcname=arcname)
    tar_stream.seek(0)
    return tar_stream

def get_usernames_for_ids(user_ids):
    """Get usernames from database"""
    pass