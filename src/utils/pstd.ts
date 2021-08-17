import axios from 'axios';

export const pstd = async (data: string) => {
  try {
    const result = await axios.post('https://paste.pr0.tips/', data);
    return result.data as string;
  } catch (err) {
    return `pstd: ${err?.message || 'unknown error'}`;
  }
};
