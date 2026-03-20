import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2 } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
}

export default function Categories() {
  const { token, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [name, setName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    if (!name.trim()) {
      setModalError('请输入分类名称');
      return;
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim(), type })
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        setShowModal(false);
        setName('');
        setModalError('');
        fetchCategories();
      } else {
        const data = await res.json();
        setModalError(data.error || '添加分类失败');
      }
    } catch (err) {
      console.error(err);
      setModalError('网络错误');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个分类吗？如果该分类下有账单，将无法删除。')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        fetchCategories();
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch (err) {
      console.error(err);
      alert('网络错误');
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">分类管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          添加分类
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="px-4 py-4 flex items-center sm:px-6">
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="truncate">
                    <div className="flex text-sm">
                      <p className="font-medium text-indigo-600 truncate">{category.name}</p>
                      <p className="ml-2 flex-shrink-0 font-normal text-gray-500">
                        ({category.type === 'income' ? '收入' : '支出'})
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5 flex items-center space-x-4">
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-gray-400 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">暂无分类数据</li>
          )}
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">添加分类</h3>
                {modalError && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {modalError}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">类型</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    >
                      <option value="expense">支出</option>
                      <option value="income">收入</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">分类名称</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="例如：餐饮、交通"
                    />
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
