import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'database.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ categories: [], subcategories: [], files: [] }, null, 2));
}

const readDB = () => {
  const data = fs.readFileSync(dbPath, 'utf-8');
  return JSON.parse(data);
};

const writeDB = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

app.get('/api/categories', (req, res) => {
  try {
    const db = readDB();
    res.json(db.categories);
  } catch (error) {
    res.status(500).json({ error: '读取分类失败' });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }
    const db = readDB();
    const newCategory = {
      id: uuidv4(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    db.categories.push(newCategory);
    writeDB(db);
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: '创建分类失败' });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const categoryIndex = db.categories.findIndex(c => c.id === id);
    if (categoryIndex === -1) {
      return res.status(404).json({ error: '分类不存在' });
    }
    const subcategoriesToDelete = db.subcategories.filter(s => s.categoryId === id);
    const subcategoryIds = subcategoriesToDelete.map(s => s.id);
    const filesToDelete = db.files.filter(f => f.subcategoryId && subcategoryIds.includes(f.subcategoryId));
    filesToDelete.forEach(file => {
      const filePath = path.join(__dirname, 'uploads', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    db.files = db.files.filter(f => !f.subcategoryId || !subcategoryIds.includes(f.subcategoryId));
    db.subcategories = db.subcategories.filter(s => s.categoryId !== id);
    db.categories.splice(categoryIndex, 1);
    writeDB(db);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除分类失败' });
  }
});

app.get('/api/subcategories', (req, res) => {
  try {
    const { categoryId } = req.query;
    const db = readDB();
    let subcategories = db.subcategories;
    if (categoryId) {
      subcategories = subcategories.filter(s => s.categoryId === categoryId);
    }
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ error: '读取子分类失败' });
  }
});

app.post('/api/subcategories', (req, res) => {
  try {
    const { categoryId, name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '子分类名称不能为空' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: '请选择所属分类' });
    }
    const db = readDB();
    const category = db.categories.find(c => c.id === categoryId);
    if (!category) {
      return res.status(404).json({ error: '所属分类不存在' });
    }
    const newSubcategory = {
      id: uuidv4(),
      categoryId,
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    db.subcategories.push(newSubcategory);
    writeDB(db);
    res.status(201).json(newSubcategory);
  } catch (error) {
    res.status(500).json({ error: '创建子分类失败' });
  }
});

app.delete('/api/subcategories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const subcategoryIndex = db.subcategories.findIndex(s => s.id === id);
    if (subcategoryIndex === -1) {
      return res.status(404).json({ error: '子分类不存在' });
    }
    const filesToDelete = db.files.filter(f => f.subcategoryId === id);
    filesToDelete.forEach(file => {
      const filePath = path.join(__dirname, 'uploads', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    db.files = db.files.filter(f => f.subcategoryId !== id);
    db.subcategories.splice(subcategoryIndex, 1);
    writeDB(db);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除子分类失败' });
  }
});

app.get('/api/files', (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.query;
    const db = readDB();
    let files = db.files;
    if (categoryId) {
      const subcategoryIds = db.subcategories
        .filter(s => s.categoryId === categoryId)
        .map(s => s.id);
      files = files.filter(f => f.subcategoryId && subcategoryIds.includes(f.subcategoryId));
    }
    if (subcategoryId) {
      files = files.filter(f => f.subcategoryId === subcategoryId);
    }
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: '读取文件列表失败' });
  }
});

app.post('/api/files', upload.single('file'), (req, res) => {
  try {
    const { subcategoryId, description, password } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }
    if (!subcategoryId) {
      return res.status(400).json({ error: '请选择子分类' });
    }
    if (password !== '750087') {
      return res.status(401).json({ error: '上传密码错误' });
    }
    const db = readDB();
    const subcategory = db.subcategories.find(s => s.id === subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ error: '子分类不存在' });
    }
    const category = db.categories.find(c => c.id === subcategory.categoryId);
    const newFile = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      categoryId: subcategory.categoryId,
      categoryName: category?.name || '',
      subcategoryId,
      subcategoryName: subcategory.name,
      description: description || '',
      createdAt: new Date().toISOString()
    };
    db.files.push(newFile);
    writeDB(db);
    res.status(201).json(newFile);
  } catch (error) {
    res.status(500).json({ error: '上传文件失败' });
  }
});

app.delete('/api/files/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const fileIndex = db.files.findIndex(f => f.id === id);
    if (fileIndex === -1) {
      return res.status(404).json({ error: '文件不存在' });
    }
    const file = db.files[fileIndex];
    const filePath = path.join(__dirname, 'uploads', file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    db.files.splice(fileIndex, 1);
    writeDB(db);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除文件失败' });
  }
});

app.get('/api/download/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const file = db.files.find(f => f.id === id);
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }
    const filePath = path.join(__dirname, 'uploads', file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件已丢失' });
    }
    res.download(filePath, file.originalName);
  } catch (error) {
    res.status(500).json({ error: '下载文件失败' });
  }
});

app.get('/api/public/files', (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.query;
    const db = readDB();
    let files = db.files;
    if (categoryId) {
      const subcategoryIds = db.subcategories
        .filter(s => s.categoryId === categoryId)
        .map(s => s.id);
      files = files.filter(f => f.subcategoryId && subcategoryIds.includes(f.subcategoryId));
    }
    if (subcategoryId) {
      files = files.filter(f => f.subcategoryId === subcategoryId);
    }
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: '读取文件列表失败' });
  }
});

app.get('/api/public/categories', (req, res) => {
  try {
    const db = readDB();
    res.json(db.categories);
  } catch (error) {
    res.status(500).json({ error: '读取分类失败' });
  }
});

app.get('/api/public/subcategories', (req, res) => {
  try {
    const { categoryId } = req.query;
    const db = readDB();
    let subcategories = db.subcategories;
    if (categoryId) {
      subcategories = subcategories.filter(s => s.categoryId === categoryId);
    }
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ error: '读取子分类失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
