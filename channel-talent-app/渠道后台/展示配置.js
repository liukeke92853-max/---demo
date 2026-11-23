(() => {
  const role = document.querySelector('#role');
  const form = document.querySelector('#profile-form');
  const nameInput = document.querySelector('#name');
  const nameView = document.querySelector('#name-view');
  const fileInput = document.querySelector('#file');
  const preview = document.querySelector('#preview');
  const placeholder = document.querySelector('#avatar-placeholder');
  const edit = document.querySelector('#edit');
  const save = document.querySelector('#save');
  const cancel = document.querySelector('#cancel');
  const message = document.querySelector('#message');
  const defaultNames = { A: '渠道 A', P1: '一级推广位', P2: '二级推广位' };
  let saved = { name: '', avatar: '' };
  let avatar = '';
  let editing = false;
  let reading = false;
  let readVersion = 0;
  const key = () => `channelProfile${role.value}`;

  function feedback(text = '', isError = false) {
    message.textContent = text;
    message.className = `profile-message ${isError ? 'error' : 'success'}`;
  }

  function showAvatar(value) {
    placeholder.hidden = Boolean(value);
    preview.hidden = !value;
    if (value) preview.src = value;
    else preview.removeAttribute('src');
  }
  preview.onerror = () => {
    preview.hidden = true;
    placeholder.hidden = false;
  };

  function setMode(value) {
    editing = value;
    reading = false;
    readVersion++;
    nameView.hidden = editing;
    nameInput.hidden = !editing;
    nameInput.disabled = !editing;
    fileInput.hidden = !editing;
    fileInput.disabled = !editing;
    edit.hidden = editing;
    save.hidden = !editing;
    cancel.hidden = !editing;
    save.disabled = false;
    save.firstChild.textContent = '保存 ';
    nameInput.removeAttribute('aria-invalid');
    feedback();
  }

  function restore() {
    nameInput.value = saved.name;
    nameView.textContent = saved.name;
    avatar = saved.avatar;
    fileInput.value = '';
    showAvatar(avatar);
  }

  function load() {
    setMode(false);
    let data = {};
    try { data = JSON.parse(localStorage.getItem(key()) || '{}') || {}; }
    catch { feedback('配置读取失败，请刷新后重试', true); }
    saved = {
      name: typeof data.name === 'string' && data.name.trim() ? data.name : defaultNames[role.value],
      avatar: typeof data.avatar === 'string' ? data.avatar : ''
    };
    restore();
  }

  edit.onclick = () => { setMode(true); nameInput.focus(); };
  cancel.onclick = () => { setMode(false); restore(); edit.focus(); };
  role.onchange = load;
  nameInput.oninput = () => { nameInput.removeAttribute('aria-invalid'); feedback(); };

  fileInput.onchange = () => {
    const version = ++readVersion;
    const file = fileInput.files[0];
    reading = false;
    save.disabled = false;
    save.firstChild.textContent = '保存 ';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      feedback('请选择图片文件', true);
      fileInput.value = '';
      return;
    }
    reading = true;
    save.disabled = true;
    save.firstChild.textContent = '读取图片中… ';
    feedback();
    const reader = new FileReader();
    const finish = (value) => {
      // 取消编辑或切换身份后，忽略上一轮选图结果。
      if (version !== readVersion || !editing) return;
      reading = false;
      save.disabled = false;
      save.firstChild.textContent = '保存 ';
      if (value) { avatar = value; showAvatar(avatar); }
      else { fileInput.value = ''; feedback('图片读取失败，请重新选择', true); }
    };
    reader.onload = () => {
      const image = new Image();
      image.onload = () => finish(reader.result);
      image.onerror = () => finish('');
      image.src = reader.result;
    };
    reader.onerror = () => finish('');
    reader.readAsDataURL(file);
  };

  form.onsubmit = (event) => {
    event.preventDefault();
    if (!editing || reading) return;
    const name = nameInput.value.trim();
    if (!name) {
      feedback('请输入展示名称', true);
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }
    const next = { name, avatar };
    try { localStorage.setItem(key(), JSON.stringify(next)); }
    catch { feedback('保存失败，请稍后重试或选择较小的图片', true); return; }
    saved = next;
    setMode(false);
    restore();
    feedback('保存成功');
    edit.focus();
  };
  load();
})();
