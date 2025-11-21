// C:/duo-frontend/components/JoinPage.tsx (НОВАЯ, ПРАВИЛЬНАЯ ВЕРСИЯ)

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Убедитесь, что путь к api правильный

interface JoinPageProps {
  isLoggedIn: boolean;
  token: string | null;
}

const JoinPage: React.FC<JoinPageProps> = ({ isLoggedIn, token }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const inviteCode = queryParams.get('code');

    if (!inviteCode) {
      navigate('/');
      return;
    }

    if (isLoggedIn && token) {
      // Пользователь уже залогинен, сразу присоединяем
      api.post('/family/join', 
          { inviteCode },
          { headers: { 'Authorization': `Bearer ${token}` } }
      )
        .then(() => {
          alert('Вы успешно присоединились к семье!');
          window.location.href = '/'; // Перезагружаемся на главный экран
        })
        .catch(error => {
          alert(`Ошибка: ${error.response?.data?.error || 'Неизвестная ошибка'}`);
          navigate('/');
        });
    } else {
      // Пользователь не залогинен, сохраняем код и отправляем на вход
      sessionStorage.setItem('inviteCode', inviteCode);
      navigate('/login');
    }
  }, [isLoggedIn, token, location, navigate]);

  return <div>Обработка приглашения...</div>;
};

export default JoinPage;