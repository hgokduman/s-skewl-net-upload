export const PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Upload</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 1.5rem; }
  h1 { font-size: 1.1rem; margin: 0 0 1rem; }
  #drop {
    border: 2px dashed #888;
    border-radius: 12px;
    padding: 2rem 1rem;
    text-align: center;
    margin-bottom: 1rem;
  }
  #drop.drag { border-color: #4a9; background: rgba(68,170,153,0.08); }
  input[type=file] { display: none; }
  label {
    display: inline-block;
    padding: 0.6rem 1.2rem;
    background: #4a9;
    color: #fff;
    border-radius: 8px;
    cursor: pointer;
  }
  ul { list-style: none; padding: 0; margin: 0; }
  li { margin-bottom: 0.75rem; }
  .name { font-size: 0.9rem; word-break: break-all; }
  .bar { background: #ddd; border-radius: 6px; height: 8px; overflow: hidden; margin: 0.3rem 0; }
  .bar > div { background: #4a9; height: 100%; width: 0%; transition: width 0.15s; }
  .bar.error > div { background: #c33; width: 100% !important; }
  a.result { font-size: 0.85rem; }
</style>
</head>
<body>
<h1>Upload to s.skewl.net</h1>
<div id="drop">
  <label for="file-input">Choose files</label>
  <input id="file-input" type="file" multiple>
  <p style="font-size:0.8rem;opacity:0.7">or drop files here</p>
</div>
<ul id="list"></ul>
<script>
(function () {
  const input = document.getElementById('file-input');
  const drop = document.getElementById('drop');
  const list = document.getElementById('list');
  const token = new URLSearchParams(location.search).get('token') || '';
  const endpoint = location.pathname + '?token=' + encodeURIComponent(token);

  function uploadFile(file) {
    const li = document.createElement('li');
    li.innerHTML = '<div class="name"></div><div class="bar"><div></div></div><div class="status"></div>';
    li.querySelector('.name').textContent = file.name;
    const fill = li.querySelector('.bar > div');
    const status = li.querySelector('.status');
    list.appendChild(li);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name));
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) fill.style.width = (e.loaded / e.total * 100) + '%';
    };
    xhr.onload = function () {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          fill.style.width = '100%';
          status.innerHTML = '<a class="result" href="' + data.url + '" target="_blank">' + data.url + '</a>';
        } else {
          li.querySelector('.bar').classList.add('error');
          status.textContent = data.error || ('Failed (' + xhr.status + ')');
        }
      } catch (e) {
        li.querySelector('.bar').classList.add('error');
        status.textContent = 'Failed (' + xhr.status + ')';
      }
    };
    xhr.onerror = function () {
      li.querySelector('.bar').classList.add('error');
      status.textContent = 'Network error';
    };
    xhr.send(file);
  }

  function handleFiles(files) {
    Array.from(files).forEach(uploadFile);
  }

  input.addEventListener('change', function () { handleFiles(input.files); });

  ['dragover', 'dragenter'].forEach(function (evt) {
    drop.addEventListener(evt, function (e) { e.preventDefault(); drop.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    drop.addEventListener(evt, function (e) { e.preventDefault(); drop.classList.remove('drag'); });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
})();
</script>
</body>
</html>
`;
