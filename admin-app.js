import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
//   استدعاء مكتبة المصادقة (الأمان)
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyD07kWys5dp3f6FJeYblxMcAfQzY94MTtE",
    authDomain: "clicks-f7ce3.firebaseapp.com",
    projectId: "clicks-f7ce3",
    storageBucket: "clicks-f7ce3.firebasestorage.app",
    messagingSenderId: "628318172493",
    appId: "1:628318172493:web:e5437bde78399b6fbaf304"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // تشغيل الأمان

// ================= نظام تسجيل الدخول الحقيقي والآمن (Firebase Auth) =================

// مراقبة حالة الدخول (هل المدير مسجل دخول أم لا؟)
onAuthStateChanged(auth, (user) => {
    const loginOverlay = document.getElementById('loginOverlay');
    if (user) {
        // المستخدم مسجل دخول صحيح
        loginOverlay.style.display = 'none';
        initDashboard(); // تشغيل وجلب بيانات لوحة التحكم
    } else {
        // المستخدم غير مسجل، يجب إظهار شاشة الدخول
        loginOverlay.style.display = 'flex';
    }
});

// عملية تسجيل الدخول عند الضغط على الزر
document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const btn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
    btn.disabled = true;
    errorMsg.style.display = 'none';

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // نجاح الدخول
            btn.innerHTML = 'تم الدخول بنجاح <i class="fas fa-check"></i>';
            document.getElementById('adminLoginForm').reset();
        })
        .catch((error) => {
            // فشل الدخول
            errorMsg.style.display = 'block';
            btn.innerHTML = 'تسجيل الدخول للنظام <i class="fas fa-sign-in-alt"></i>';
            btn.disabled = false;
        });
});

// تسجيل الخروج
window.logoutAdmin = () => {
    signOut(auth).then(() => {
        // سيتم تحويله تلقائياً لشاشة الدخول عبر onAuthStateChanged
    }).catch((error) => {
        alert("حدث خطأ أثناء تسجيل الخروج");
    });
};

// ================= متغيرات ووظائف واجهة المستخدم (UI) =================

// عرض التاريخ الحالي
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('currentDate').querySelector('span').innerText = new Date().toLocaleDateString('ar-EG', options);

// القائمة الجانبية للموبايل
window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('active');
};

// تبديل صفحات لوحة التحكم
window.switchTab = (tabId, el) => {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.getElementById(tabId + 'Section').style.display = 'block';
    
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    if(el) el.classList.add('active');
    
    const titles = { 
        'dashboard': 'لوحة القيادة (Dashboard)', 
        'orders': 'الطلبات الواردة', 
        'add': 'إضافة منتج جديد', 
        'manage': 'إدارة المنتجات', 
        'warehouse': 'جرد المخزون' 
    };
    document.getElementById('pageTitle').innerText = titles[tabId];

    if(window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }

    if(tabId === 'manage') loadManageData('all');
};

// ================= العمليات الأساسية (Firestore) =================

let base64Image = "";
let editBase64Image = "";
let currentEditId = null;
let currentOrderId = null;
let unsubscribeManage = null;
let allOrdersLocal = [];
let allProductsLocal = [];

function initDashboard() {
    const productsRef = collection(db, "products");
    const ordersRef = collection(db, "orders");

    // 1. إحصائيات المنتجات والمخزن
    onSnapshot(productsRef, (snap) => {
        allProductsLocal = [];
        document.getElementById('statTotalProducts').innerText = snap.size;
        let lowStockCount = 0;
        
        const warehouseTbody = document.getElementById('warehouseTableBody');
        warehouseTbody.innerHTML = "";

        snap.forEach(d => { 
            const p = d.data();
            allProductsLocal.push({id: d.id, ...p});
            if(p.qty < 5) lowStockCount++; 

            // تعبئة جدول المخزن
            const statusBadge = p.qty < 5 ? `<span class="badge bg-danger">مخزون منخفض</span>` : `<span class="badge bg-success">متوفر</span>`;
            warehouseTbody.innerHTML += `
                <tr>
                    <td style="font-weight:800; color:var(--dark);"><i class="fas fa-barcode text-muted"></i> ${p.sku || 'N/A'}<br><span style="font-size:12px; font-weight:600;">${p.name}</span></td>
                    <td><span class="badge bg-info">${p.category}</span></td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="number" value="${p.qty}" onchange="updateQty('${d.id}', this.value)" 
                                class="form-control" style="width:80px; text-align:center; padding:8px; font-weight:800;">
                            <button class="btn btn-icon btn-outline" title="تحديث"><i class="fas fa-check"></i></button>
                        </div>
                    </td>
                </tr>`;
        });
        document.getElementById('statLowStock').innerText = lowStockCount;
    });

    // 2. إحصائيات وجداول الطلبات
    onSnapshot(query(ordersRef, orderBy("createdAt", "desc")), (snap) => {
        allOrdersLocal = [];
        let newOrders = 0;
        let revenue = 0;
        
        const fullTbody = document.getElementById('ordersTableBody');
        const recentTbody = document.getElementById('recentOrdersTable');
        fullTbody.innerHTML = "";
        recentTbody.innerHTML = "";
        
        let counter = 0;

        snap.forEach(docSnap => {
            const o = docSnap.data();
            allOrdersLocal.push({id: docSnap.id, ...o});
            
            if(o.status === 'جديد') newOrders++; 
            if(o.status === 'تم التوصيل') revenue += Number(o.totalAmount || 0);

            let badgeClass = 'bg-info';
            if(o.status === 'قيد التنفيذ') badgeClass = 'bg-warning';
            if(o.status === 'تم التوصيل') badgeClass = 'bg-success';
            if(o.status === 'ملغي') badgeClass = 'bg-danger';

            const dateStr = o.createdAt ? o.createdAt.toDate().toLocaleDateString('ar-EG') : 'غير محدد';
            const shortId = docSnap.id.slice(-6).toUpperCase();
            
            // جدول الطلبات الشامل
            fullTbody.innerHTML += `
                <tr>
                    <td style="font-family: monospace; font-weight: 900; color: var(--primary);">#${shortId}</td>
                    <td><strong>${o.customer.name}</strong><br><span style="font-size:12px; color:var(--text-muted);"><i class="fas fa-phone"></i> ${o.customer.phone}</span></td>
                    <td>${dateStr}</td>
                    <td style="font-weight: 900; color:var(--dark);">${Number(o.totalAmount).toLocaleString()} ج.م</td>
                    <td><span class="badge ${badgeClass}">${o.status}</span></td>
                    <td>
                        <button class="btn btn-outline btn-icon" onclick="openOrderModal('${docSnap.id}')" title="التفاصيل والفاتورة"><i class="fas fa-file-invoice"></i></button>
                        <button class="btn btn-danger btn-icon" onclick="deleteOrder('${docSnap.id}')" title="حذف الطلب نهائياً" style="background:#fef2f2; color:#ef4444; border:none;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;

            // جدول النظرة السريعة (آخر 5 طلبات)
            if(counter < 5) {
                recentTbody.innerHTML += `
                <tr>
                    <td style="font-weight: bold; color: var(--primary);">#${shortId}</td>
                    <td>${o.customer.name}</td>
                    <td style="font-weight: bold;">${Number(o.totalAmount).toLocaleString()} ج.م</td>
                    <td><span class="badge ${badgeClass}">${o.status}</span></td>
                </tr>`;
                counter++;
            }
        });

        document.getElementById('statNewOrders').innerText = newOrders;
        document.getElementById('menuOrdersCount').innerText = newOrders;
        document.getElementById('statTotalRevenue').innerHTML = `${revenue.toLocaleString()} <span>ج.م</span>`;
    });
}

// ================= دوال التحكم في الطلبات =================
window.openOrderModal = (id) => {
    const order = allOrdersLocal.find(o => o.id === id);
    if(!order) return;
    currentOrderId = id;
    
    document.getElementById('modalOrderId').innerText = id.slice(-6).toUpperCase();
    document.getElementById('oName').innerText = order.customer.name;
    document.getElementById('oPhone').innerText = order.customer.phone;
    document.getElementById('oPhoneLink').href = `tel:${order.customer.phone}`;
    document.getElementById('oAddress').innerText = order.customer.address;
    document.getElementById('oDelivery').innerText = order.customer.delivery;
    document.getElementById('oPayment').innerText = order.customer.payment;
    document.getElementById('oDate').innerText = order.createdAt ? order.createdAt.toDate().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' }) : '';
    document.getElementById('oTotal').innerText = `${Number(order.totalAmount).toLocaleString()} ج.م`;
    document.getElementById('oStatusSelect').value = order.status;

    const list = document.getElementById('oItemsList');
    list.innerHTML = "";
    order.items.forEach(item => {
        const itemQty = item.qty || 1;
        list.innerHTML += `
            <tr>
                <td style="font-weight:800;">${item.name}</td>
                <td style="text-align:center;"><span class="badge bg-info">x${itemQty}</span></td>
                <td style="text-align:left; font-weight:900; color:var(--primary);">${(item.price * itemQty).toLocaleString()} ج.م</td>
            </tr>`;
    });

    document.getElementById('orderModal').style.display = 'flex';
};

window.closeOrderModal = () => document.getElementById('orderModal').style.display = 'none';

window.updateOrderStatus = async () => {
    const newStatus = document.getElementById('oStatusSelect').value;
    await updateDoc(doc(db, "orders", currentOrderId), { status: newStatus });
    showToast("تم تحديث مسار الطلب بنجاح", "success");
    closeOrderModal();
};

window.deleteOrder = async (id) => {
    if(confirm("تحذير: هل أنت متأكد من حذف هذا الطلب نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.")) {
        await deleteDoc(doc(db, "orders", id));
        showToast("تم الحذف بنجاح", "danger");
    }
};

// ================= دوال إضافة وإدارة المنتجات =================
document.getElementById('fileInput').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        base64Image = ev.target.result;
        document.getElementById('imagePreview').src = base64Image;
        document.getElementById('imagePreview').style.display = 'block';
        document.querySelector('.upload-icon').style.display = 'none';
    };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
});

window.saveNewProduct = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    
    if(!base64Image) {
        alert("برجاء رفع صورة المنتج الأساسية.");
        return;
    }

    const data = {
        name: document.getElementById('itemName').value,
        brand: document.getElementById('itemBrand').value,
        sku: document.getElementById('itemSKU').value,
        category: document.getElementById('itemCategory').value,
        condition: document.getElementById('itemCondition').value,
        warranty: document.getElementById('itemWarranty').value,
        price: Number(document.getElementById('itemPrice').value),
        oldPrice: Number(document.getElementById('itemOldPrice').value) || null,
        qty: Number(document.getElementById('itemQty').value),
        description: document.getElementById('itemDesc').value,
        image: base64Image,
        createdAt: new Date()
    };

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع للسيرفر...';
    try {
        await addDoc(collection(db, "products"), data);
        showToast("تم إضافة المنتج بنجاح للقاعدة!", "success");
        document.getElementById('addProductForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        document.querySelector('.upload-icon').style.display = 'block';
        base64Image = "";
        
        // التحويل لصفحة الإدارة بعد الإضافة
        setTimeout(() => switchTab('manage', document.querySelectorAll('.sidebar-menu a')[3]), 1000);
        
    } catch(e) { 
        alert("حدث خطأ أثناء الاتصال بقاعدة البيانات."); 
    }
    btn.disabled = false; btn.innerHTML = `<i class="fas fa-save"></i> حفظ ونشر المنتج`;
};

window.loadManageData = (cat, btnEl) => {
    if(btnEl) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
    if(unsubscribeManage) unsubscribeManage();
    
    let q = cat === 'all' 
        ? query(collection(db, "products"), orderBy("createdAt", "desc")) 
        : query(collection(db, "products"), where("category", "==", cat), orderBy("createdAt", "desc"));
    
    unsubscribeManage = onSnapshot(q, (snap) => {
        const tbody = document.getElementById('manageTableBody');
        tbody.innerHTML = "";
        snap.forEach(docSnap => {
            const p = docSnap.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${p.image}" style="width:60px; height:60px; object-fit:contain; border-radius:10px; background:#f8fafc; padding:5px; border:1px solid #e2e8f0;"></td>
                    <td><div style="font-weight:900; color:var(--dark); font-size:15px; margin-bottom:4px;">${p.name}</div><div style="font-size:12px; color:var(--text-muted);"><i class="fas fa-tag"></i> ${p.brand || 'عام'} | SKU: ${p.sku || 'N/A'}</div></td>
                    <td><span class="badge bg-info">${p.category}</span></td>
                    <td style="color:var(--primary); font-weight:900; font-size:16px;">${Number(p.price).toLocaleString()} ج.م</td>
                    <td>
                        <button class="btn btn-icon btn-outline" onclick="openEditModal('${docSnap.id}')" title="تعديل"><i class="fas fa-pen text-warning"></i></button>
                        <button class="btn btn-icon btn-outline" onclick="deleteProd('${docSnap.id}')" title="حذف"><i class="fas fa-trash text-danger"></i></button>
                    </td>
                </tr>`;
        });
    });
};

window.updateQty = async (id, val) => {
    await updateDoc(doc(db, "products", id), { qty: Number(val) });
    showToast("تم تحديث الكمية بالمخزن", "success");
};

window.deleteProd = async (id) => {
    if(confirm("هل أنت متأكد من حذف هذا المنتج من المتجر نهائياً؟")) {
        await deleteDoc(doc(db, "products", id));
        showToast("تم مسح المنتج", "danger");
    }
};

// ================= تعديل المنتج =================
window.openEditModal = (id) => {
    const p = allProductsLocal.find(x => x.id === id);
    if(!p) return;
    currentEditId = id;
    document.getElementById('eName').value = p.name;
    document.getElementById('eBrand').value = p.brand || '';
    document.getElementById('eSKU').value = p.sku || '';
    document.getElementById('eCategory').value = p.category;
    document.getElementById('eCondition').value = p.condition || 'جديد';
    document.getElementById('ePrice').value = p.price;
    document.getElementById('eOldPrice').value = p.oldPrice || '';
    document.getElementById('eQty').value = p.qty || 0;
    document.getElementById('eWarranty').value = p.warranty || '';
    document.getElementById('eDesc').value = p.description || '';
    editBase64Image = p.image;
    document.getElementById('editModal').style.display = 'flex';
};

window.closeEditModal = () => document.getElementById('editModal').style.display = 'none';

document.getElementById('eFileInput').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => editBase64Image = ev.target.result;
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
});

window.saveEditProduct = async () => {
    await updateDoc(doc(db, "products", currentEditId), {
        name: document.getElementById('eName').value,
        brand: document.getElementById('eBrand').value,
        sku: document.getElementById('eSKU').value,
        category: document.getElementById('eCategory').value,
        condition: document.getElementById('eCondition').value,
        price: Number(document.getElementById('ePrice').value),
        oldPrice: Number(document.getElementById('eOldPrice').value) || null,
        qty: Number(document.getElementById('eQty').value),
        warranty: document.getElementById('eWarranty').value,
        description: document.getElementById('eDesc').value,
        image: editBase64Image
    });
    showToast("تم اعتماد التعديلات وتحديث المتجر", "success");
    closeEditModal();
};

// ================= نظام الإشعارات =================
window.showToast = (message, type = 'success') => {
    const container = document.getElementById('adminToastContainer');
    if(!container) return;
    
    // تصميم التوست السريع
    container.style.position = 'fixed';
    container.style.bottom = '30px';
    container.style.right = '30px';
    container.style.zIndex = '9999';
    
    const toast = document.createElement('div');
    const color = type === 'success' ? '#10b981' : (type === 'danger' ? '#ef4444' : '#0061f2');
    toast.style.background = '#0f172a';
    toast.style.color = 'white';
    toast.style.padding = '15px 25px';
    toast.style.borderRadius = '12px';
    toast.style.marginTop = '10px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toast.style.borderLeft = `5px solid ${color}`;
    toast.style.fontWeight = 'bold';
    toast.style.animation = 'fadeIn 0.3s ease';
    
    toast.innerHTML = `<i class="fas fa-info-circle" style="color:${color}; margin-left:8px;"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
};

// إغلاق النوافذ عند الضغط على ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEditModal();
        closeOrderModal();
    }
});
