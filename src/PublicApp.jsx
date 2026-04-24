import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PublicApp() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const response = await axios.get('/api/public/categories');
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
      const response = await axios.get('/api/public/subcategories', {
        params: { categoryId: selectedCategory }
      });
      setSubcategories(response.data);
      if (response.data.length > 0 && !selectedSubcategory) {
        setSelectedSubcategory(response.data[0].id);
      } else {
        setSelectedSubcategory(null);
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
      const response = await axios.get('/api/public/files', { params });
      setFiles(response.data);
    } catch (err) {
      setError('加载文件失败');
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
        <h1>📁 文件分享站 - 公共访问</h1>
        <p>浏览和下载共享文件</p>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="content">
        <aside className="sidebar">
          <h2>📂 分类浏览</h2>
          {loading && <div className="loading">加载中...</div>}
          {!loading && categories.length === 0 && (
            <div className="error">暂无分类</div>
          )}
          {!loading && categories.map(category => (
            <div 
              key={category.id} 
              className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span>{category.name}</span>
            </div>
          ))}

          {selectedCategory && (
            <div style={{ marginTop: '20px' }}>
              <h3>子分类</h3>
              {!loading && subcategories.length === 0 && (
                <div className="error">暂无子分类</div>
              )}
              {!loading && subcategories.map(subcategory => (
                <div 
                  key={subcategory.id} 
                  className={`category-item ${selectedSubcategory === subcategory.id ? 'active' : ''}`}
                  style={{ marginLeft: '10px' }}
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                >
                  <span>└─ {subcategory.name}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="main-content">
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

export default PublicApp;