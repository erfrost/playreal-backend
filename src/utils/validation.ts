export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+={}\[\]:;"'<>,.?~`\\|-]+$/;
  return (
    passwordRegex.test(password) &&
    password.length >= 7 &&
    password.length <= 15
  );
};

export const isValidNickname = (nickname: string): boolean => {
  const nicknameRegex = /^[a-zA-Zа-яА-Я0-9]+$/;
  return (
    nicknameRegex.test(nickname) &&
    nickname.length >= 3 &&
    nickname.length <= 14
  );
};
