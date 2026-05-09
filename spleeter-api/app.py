from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from spleeter.separator import Separator
import os
import uuid
import shutil
from pathlib import Path

app = FastAPI(title="Spleeter API - Vocal Remover")

# CORS para permitir requisições da página web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurações
UPLOAD_DIR = Path("../uploads")
OUTPUT_DIR = Path("../downloads")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Inicializa o Spleeter (modelo 2 stems: vocal + instrumental)
separator = Separator('spleeter:2stems')

@app.post("/separate")
async def separate_audio(audio: UploadFile = File(...)):
    """Recebe um arquivo de áudio, separa vocal e instrumental"""
    
    # Verifica extensão
    if not audio.filename.endswith(('.mp3', '.wav', '.flac', '.m4a')):
        raise HTTPException(400, "Formato não suportado. Use MP3, WAV, FLAC ou M4A.")
    
    # Gera ID único
    file_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{file_id}_{audio.filename}"
    output_path = OUTPUT_DIR / file_id
    
    # Salva arquivo
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    
    try:
        # Processa com Spleeter
        separator.separate_to_file(str(input_path), str(OUTPUT_DIR))
        
        # Os arquivos gerados ficam em OUTPUT_DIR/{file_id}_filename/
        # Mas o Spleeter cria uma pasta com o nome do arquivo original
        processed_folder = OUTPUT_DIR / f"{file_id}_{Path(audio.filename).stem}"
        
        # Mapeia os resultados
        vocal_file = processed_folder / "vocals.wav"
        instrumental_file = processed_folder / "accompaniment.wav"
        
        # Renomeia para organização
        vocal_dest = OUTPUT_DIR / f"{file_id}_vocals.wav"
        instrumental_dest = OUTPUT_DIR / f"{file_id}_instrumental.wav"
        
        if vocal_file.exists():
            shutil.move(str(vocal_file), str(vocal_dest))
        if instrumental_file.exists():
            shutil.move(str(instrumental_file), str(instrumental_dest))
        
        # Limpa pasta temporária
        shutil.rmtree(processed_folder, ignore_errors=True)
        os.remove(input_path)
        
        return {
            "success": True,
            "vocal_url": f"/downloads/{file_id}_vocals.wav",
            "instrumental_url": f"/downloads/{file_id}_instrumental.wav",
            "message": "Processamento concluído com sucesso!"
        }
        
    except Exception as e:
        raise HTTPException(500, f"Erro no processamento: {str(e)}")

@app.get("/downloads/{filename}")
async def download_file(filename: str):
    """Endpoint para baixar os arquivos processados"""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, "Arquivo não encontrado")
    return FileResponse(file_path, filename=filename)

@app.on_event("shutdown")
def cleanup():
    """Limpa arquivos temporários ao desligar"""
    for file in OUTPUT_DIR.glob("*"):
        if file.is_file():
            file.unlink()
    for file in UPLOAD_DIR.glob("*"):
        if file.is_file():
            file.unlink()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
