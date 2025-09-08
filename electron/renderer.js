document.getElementById('uploadBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('fileInput');
  if (fileInput.files.length > 0) {
    const filePath = fileInput.files[0].path;
    window.pixer
      .uploadImage(filePath)
      .then(() => alert('上傳完成'))
      .catch((err) => alert('上傳失敗: ' + err.message));
  }
});
