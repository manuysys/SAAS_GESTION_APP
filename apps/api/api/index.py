import sys
from pathlib import Path

# Vercel ejecuta la función desde api/; agregamos la raíz del proyecto al path
# para poder importar el paquete app.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from mangum import Mangum

from app.main import app

handler = Mangum(app, lifespan="off")
