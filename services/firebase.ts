
// In a real scenario, we import standard firebase SDKs
// import { initializeApp } from "firebase/app";
// import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

// Mocking the behavior for the generated artifact since we don't have real keys
// Accessing the env vars requested in the prompt
const APP_ID = process.env.__app_id || 'demo-app';
// const FIREBASE_CONFIG = process.env.__firebase_config; 

export const saveSimulation = async (userId: string, data: any) => {
  console.log(`[Firebase Mock] Saving simulation to /artifacts/${APP_ID}/users/${userId}/simulations`, data);
  
  const key = `watton_sims_${userId}`;
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  
  // VALIDAÇÃO DE DUPLICADOS (Por NIF)
  // Ignora se estivermos a atualizar o mesmo registo (mesmo ID), mas bloqueia se for novo registo com NIF existente
  const existingClient = current.find((item: any) => item.data.nif_cliente === data.data.nif_cliente);
  
  if (existingClient && existingClient.id !== data.id) {
      return { 
          success: false, 
          message: `O NIF ${data.data.nif_cliente} já existe no portfólio associado ao cliente "${existingClient.data.nome_cliente}".` 
      };
  }

  // Se já existe (update) remove o antigo para inserir o novo, ou apenas adiciona
  const filtered = current.filter((item: any) => item.id !== data.id);
  
  const newRecord = { 
    ...data, 
    id: data.id || Date.now().toString(), 
    createdAt: new Date().toISOString() 
  };
  
  filtered.push(newRecord);
  localStorage.setItem(key, JSON.stringify(filtered));
  
  return { success: true, message: "Cliente gravado com sucesso." };
};

export const getHistory = async (userId: string) => {
  console.log(`[Firebase Mock] Fetching history for ${userId}`);
  const key = `watton_sims_${userId}`;
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  // Sort by date desc
  return data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const deleteSimulation = async (userId: string, recordId: string) => {
  console.log(`[Firebase Mock] Deleting simulation ${recordId} for ${userId}`);
  const key = `watton_sims_${userId}`;
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = current.filter((item: any) => item.id !== recordId);
  localStorage.setItem(key, JSON.stringify(filtered));
  return filtered;
};
