import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ================= نظام تسجيل الدخول (تشفير وإخفاء الباسوورد) =================
const SECRET = "OTlAYWZhdHN1TQ==";

window.checkAdminPassword = () => {
    const input = document.getElementById('adminPassword').value;
    const reversed = input.split('').reverse().join('');
    if (btoa(reversed) === SECRET) {
        sessionStorage.setItem('clicksAdminAuth', 'true');
        document.getElementById('loginOverlay').style.display = 'none';
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
};

window.handleLoginKey = (e) => {
    if(e.key === 'Enter') checkAdminPassword();
};

if (sessionStorage.getItem('clicksAdminAuth') === 'true') {
    document.getElementById('loginOverlay').style.display = 'none';
}

window.logoutAdmin = () => {
    sessionStorage.removeItem('clicksAdminAuth');
    location.reload();
};
// =====================================================================

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

// Date Display
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('currentDate').innerText = new Date().toLocaleDateString('ar-EG', options);

let base64Image = "";
let editBase64Image = "";
let currentEditId = null;
let currentOrderId = null;
let unsubscribeManage = null;

// تبديل الشاشات
window.switchTab = (tabId, el) => {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.getElementById(tabId + 'Section').style.display = 'block';
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    el.classList.add('active');
    
    const titles = { 'dashboard': 'نظرة عامة', 'orders': 'الطلبات الواردة', 'add': 'إضافة منتج', 'manage': 'إدارة المنتجات', 'warehouse': 'جرد المخزن' };
    document.getElementById('pageTitle').innerText = titles[tabId];

    if(tabId === 'manage') loadManageData('all');
};

// ================= Dashboard & Stats =================
const productsRef = collection(db, "products");
const ordersRef = collection(db, "orders");

onSnapshot(productsRef, (snap) => {
    document.getElementById('statTotalProducts').innerText = snap.size;
    let lowStockCount = 0;
    snap.forEach(d => { if(d.data().qty < 5) lowStockCount++; });
    document.getElementById('statLowStock').innerText = lowStockCount;
});

onSnapshot(ordersRef, (snap) => {
    let newOrders = 0;
    let revenue = 0;
    snap.forEach(d => { 
        if(d.data().status === 'جديد') newOrders++; 
        if(d.data().status === 'تم التوصيل') revenue += Number(d.data().totalAmount || 0);
    });
    document.getElementById('statNewOrders').innerText = newOrders;
    document.getElementById('menuOrdersCount').innerText = newOrders;
    document.getElementById('statTotalRevenue').innerText = revenue.toLocaleString();
});

// ================= Orders Section =================
onSnapshot(query(ordersRef, orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = "";
    snap.forEach(docSnap => {
        const o = docSnap.data();
        let badgeClass = 'bg-new';
        if(o.status === 'قيد التنفيذ') badgeClass = 'bg-processing';
        if(o.status === 'تم التوصيل') badgeClass = 'bg-delivered';
        if(o.status === 'ملغي') badgeClass = 'bg-cancelled';

        const dateStr = o.createdAt ? o.createdAt.toDate().toLocaleDateString('ar-EG') : 'غير محدد';
        
        tbody.innerHTML += `
            <tr>
                <td style="font-family: monospace; font-weight: bold; color: var(--primary);">#${docSnap.id.slice(-6).toUpperCase()}</td>
                <td>${o.customer.name}</td>
                <td>${dateStr}</td>
                <td style="font-weight: 800;">${Number(o.totalAmount).toLocaleString()} ج.م</td>
                <td><span class="badge ${badgeClass}">${o.status}</span></td>
                <td>
                    <button class="btn btn-icon btn-view" onclick="openOrderModal('${docSnap.id}')" title="التفاصيل"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-icon btn-delete" onclick="deleteOrder('${docSnap.id}')" title="حذف"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
});

let allOrdersLocal = [];
onSnapshot(ordersRef, (snap) => {
    allOrdersLocal = [];
    snap.forEach(d => allOrdersLocal.push({id: d.id, ...d.data()}));
});

window.openOrderModal = (id) => {
    const order = allOrdersLocal.find(o => o.id === id);
    if(!order) return;
    currentOrderId = id;
    
    document.getElementById('modalOrderId').innerText = id.slice(-6).toUpperCase();
    document.getElementById('oName').innerText = order.customer.name;
    document.getElementById('oPhone').innerText = order.customer.phone;
    document.getElementById('oAddress').innerText = order.customer.address;
    document.getElementById('oDelivery').innerText = order.customer.delivery;
    document.getElementById('oPayment').innerText = order.customer.payment;
    document.getElementById('oDate').innerText = order.createdAt ? order.createdAt.toDate().toLocaleString('ar-EG') : '';
    document.getElementById('oTotal').innerText = Number(order.totalAmount).toLocaleString();
    document.getElementById('oStatusSelect').value = order.status;

    const list = document.getElementById('oItemsList');
    list.innerHTML = "";
    order.items.forEach(item => {
        list.innerHTML += `<li><span>${item.name}</span> <span style="color:var(--primary);">${Number(item.price).toLocaleString()} ج.م</span></li>`;
    });

    document.getElementById('orderModal').style.display = 'flex';
};

window.closeOrderModal = () => document.getElementById('orderModal').style.display = 'none';

window.updateOrderStatus = async () => {
    const newStatus = document.getElementById('oStatusSelect').value;
    await updateDoc(doc(db, "orders", currentOrderId), { status: newStatus });
    alert("تم تحديث حالة الطلب!");
    closeOrderModal();
};

window.deleteOrder = async (id) => {
    if(confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) {
        await deleteDoc(doc(db, "orders", id));
    }
};

// ================= Add Product =================
document.getElementById('fileInput').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        base64Image = ev.target.result;
        document.getElementById('imagePreview').src = base64Image;
        document.getElementById('imagePreview').style.display = 'block';
    };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
});

document.getElementById('saveBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveBtn');
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

    if(!data.name || !data.price || !base64Image) return alert("الاسم والسعر والصورة بيانات إلزامية");
    
    btn.disabled = true; btn.innerHTML = "جاري الرفع...";
    try {
        await addDoc(collection(db, "products"), data);
        alert("تم إضافة المنتج بنجاح!");
        document.querySelectorAll('#addSection input, #addSection textarea').forEach(el => el.value = '');
        document.getElementById('imagePreview').style.display = 'none';
        base64Image = "";
    } catch(e) { alert("حدث خطأ"); }
    btn.disabled = false; btn.innerHTML = `<i class="fas fa-save"></i> حفظ المنتج في قاعدة البيانات`;
});

// ================= Manage Products =================
window.loadManageData = (cat, btnEl) => {
    if(btnEl) {
        document.querySelectorAll('.tab-pill').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
    if(unsubscribeManage) unsubscribeManage();
    
    let q = cat === 'all' ? query(productsRef, orderBy("createdAt", "desc")) : query(productsRef, where("category", "==", cat), orderBy("createdAt", "desc"));
    
    unsubscribeManage = onSnapshot(q, (snap) => {
        const tbody = document.getElementById('manageTableBody');
        tbody.innerHTML = "";
        snap.forEach(docSnap => {
            const p = docSnap.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${p.image}" style="width:50px; height:50px; object-fit:cover; border-radius:10px;"></td>
                    <td style="font-weight:700;">${p.name}</td>
                    <td><span class="badge" style="background:#f1f5f9; color:#475569;">${p.category}</span></td>
                    <td style="color:var(--primary); font-weight:800;">${Number(p.price).toLocaleString()} ج.م</td>
                    <td>
                        <button class="btn btn-icon btn-edit" onclick="openEditModal('${docSnap.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" onclick="deleteProd('${docSnap.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        });
    });
};

// ================= Warehouse =================
onSnapshot(query(productsRef, orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('warehouseTableBody');
    tbody.innerHTML = "";
    snap.forEach(docSnap => {
        const p = docSnap.data();
        const statusBadge = p.qty < 5 ? `<span class="badge bg-cancelled">مخزون منخفض</span>` : `<span class="badge bg-delivered">متوفر</span>`;
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:700;">${p.name}</td>
                <td>${p.category}</td>
                <td>${statusBadge}</td>
                <td>
                    <input type="number" value="${p.qty}" onchange="updateQty('${docSnap.id}', this.value)" 
                           style="width:80px; padding:8px; text-align:center; background:#fff; border:2px solid #e2e8f0; font-weight:800; color:var(--primary);">
                </td>
            </tr>`;
    });
});

window.updateQty = async (id, val) => {
    await updateDoc(doc(db, "products", id), { qty: Number(val) });
};

window.deleteProd = async (id) => {
    if(confirm("حذف المنتج؟")) await deleteDoc(doc(db, "products", id));
};

// ================= Edit Product =================
let allProductsLocal = [];
onSnapshot(productsRef, (snap) => {
    allProductsLocal = [];
    snap.forEach(d => allProductsLocal.push({id: d.id, ...d.data()}));
});

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
    alert("تم التحديث بنجاح");
    closeEditModal();
};

// تفعيل زر ESC للإغلاق
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEditModal();
        closeOrderModal();
    }
});