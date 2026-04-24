import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSubcategory, setUploadSubcategory] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPassword, setUploadPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadSubcategories();
    } else {
      setSubcategories([]);
      setSelectedSubcategory(null);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadFiles();
  }, [selectedCategory, selectedSubcategory]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (err) {
      setError('加载分类失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/subcategories', {
        params: { categoryId: selectedCategory }
      });
      setSubcategories(response.data);
      if (response.data.length > 0 && !selectedSubcategory) {
        setSelectedSubcategory(response.data[0].id);
        setUploadSubcategory(response.data[0].id);
      } else {
        setSelectedSubcategory(null);
        setUploadSubcategory('');
      }
    } catch (err) {
      setError('加载子分类失败');
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) {
        params.categoryId = selectedCategory;
      }
      if (selectedSubcategory) {
        params.subcategoryId = selectedSubcategory;
      }
      const response = await axios.get('/api/files', { params });
      setFiles(response.data);
    } catch (err) {
      setError('加载文件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setError('分类名称不能为空');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post('/api/categories', { name: newCategoryName });
      setCategories([...categories, response.data]);
      setNewCategoryName('');
      setSuccess('分类创建成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('创建分类失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('确定要删除这个分类吗？分类下的所有子分类和文件也会被删除。')) {
      return;
    }
    try {
      setLoading(true);
      await axios.delete(`/api/categories/${categoryId}`);
      setCategories(categories.filter(c => c.id !== categoryId));
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
      }
      setSuccess('分类删除成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('删除分类失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!newSubcategoryName.trim()) {
      setError('子分类名称不能为空');
      return;
    }
    if (!selectedCategory) {
      setError('请先选择所属分类');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post('/api/subcategories', {
        categoryId: selectedCategory,
        name: newSubcategoryName
      });
      setSubcategories([...subcategories, response.data]);
      setNewSubcategoryName('');
      setSuccess('子分类创建成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('创建子分类失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (!confirm('确定要删除这个子分类吗？子分类下的所有文件也会被删除。')) {
      return;
    }
    try {
      setLoading(true);
      await axios.delete(`/api/subcategories/${subcategoryId}`);
      setSubcategories(subcategories.filter(s => s.id !== subcategoryId));
      if (selectedSubcategory === subcategoryId) {
        setSelectedSubcategory(subcategories[0]?.id || null);
      }
      setSuccess('子分类删除成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('删除子分类失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('请选择文件');
      return;
    }
    if (!uploadSubcategory) {
      setError('请选择子分类');
      return;
    }
    if (!uploadPassword) {
      setError('请输入上传密码');
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('subcategoryId', uploadSubcategory);
      formData.append('description', uploadDescription);
      formData.append('password', uploadPassword);
      await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadFile(null);
      setUploadDescription('');
      setUploadPassword('');
      loadFiles();
      setSuccess('文件上传成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '上传文件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('确定要删除这个文件吗？')) {
      return;
    }
    try {
      setLoading(true);
      await axios.delete(`/api/files/${fileId}`);
      setFiles(files.filter(f => f.id !== fileId));
      setSuccess('文件删除成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('删除文件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fileId, originalName) => {
    window.open(`/api/download/${fileId}`, '_blank');
  };

  return (
    <div className="container">
      <header className="header">
        <h1>📁 文件分享站</h1>
        <p>安全、便捷的文件存储与分享平台</p>
      </header>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="content">
        <aside className="sidebar">
          <h2>📂 分类管理</h2>
          {loading && <div className="loading">加载中...</div>}
          {!loading && categories.length === 0 && (
            <div className="error">暂无分类，请创建分类</div>
          )}
          {!loading && categories.map(category => (
            <div 
              key={category.id} 
              className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span>{category.name}</span>
              <button 
                className="btn btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCategory(category.id);
                }}
              >
                删除
              </button>
            </div>
          ))}

          <div className="category-actions">
            <h3>创建新分类</h3>
            <form onSubmit={handleAddCategory}>
              <input
                type="text"
                placeholder="分类名称"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                创建分类
              </button>
            </form>
          </div>

          {selectedCategory && (
            <div className="category-actions" style={{ marginTop: '20px' }}>
              <h3>子分类管理</h3>
              {!loading && subcategories.length === 0 && (
                <div className="error">暂无子分类，请创建子分类</div>
              )}
              {!loading && subcategories.map(subcategory => (
                <div 
                  key={subcategory.id} 
                  className={`category-item ${selectedSubcategory === subcategory.id ? 'active' : ''}`}
                  style={{ marginLeft: '10px' }}
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                >
                  <span>└─ {subcategory.name}</span>
                  <button 
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubcategory(subcategory.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
              <form onSubmit={handleAddSubcategory} style={{ marginTop: '15px' }}>
                <input
                  type="text"
                  placeholder="子分类名称"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  创建子分类
                </button>
              </form>
            </div>
          )}
        </aside>

        <main className="main-content">
          <section className="upload-section">
            <h3>📤 上传文件</h3>
            <form className="upload-form" onSubmit={handleUpload}>
              <input type="file" onChange={handleFileChange} />
              <select 
                value={uploadSubcategory} 
                onChange={(e) => setUploadSubcategory(e.target.value)}
              >
                <option value="">选择子分类</option>
                {subcategories.map(subcategory => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              <input
                type="password"
                placeholder="上传密码"
                value={uploadPassword}
                onChange={(e) => setUploadPassword(e.target.value)}
              />
              <textarea
                placeholder="文件描述（可选）"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              ></textarea>
              <button type="submit" className="btn btn-primary">
                上传文件
              </button>
            </form>
          </section>

          <section className="files-section">
            <h3>📄 文件列表</h3>
            {loading && <div className="loading">加载中...</div>}
            {!loading && files.length === 0 && (
              <div className="error">
                {selectedSubcategory ? '该子分类下暂无文件' : '请选择子分类查看文件'}
              </div>
            )}
            <div className="file-list">
              {!loading && files.map(file => (
                <div key={file.id} className="file-card">
                  <h4>{file.originalName}</h4>
                  <p>大小: {Math.round(file.size / 1024)} KB</p>
                  <p>分类: {file.categoryName}</p>
                  <p>子分类: {file.subcategoryName}</p>
                  {file.description && <p>描述: {file.description}</p>}
                  <p>上传时间: {new Date(file.createdAt).toLocaleString()}</p>
                  <div className="file-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleDownload(file.id, file.originalName)}
                    >
                      下载
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;