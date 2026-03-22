import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { useStore } from '../../../store/useStore';

const useSearch = () => {
  const boards = useStore((state) => state.boards);
  const standaloneTasks = useStore((state) => state.standaloneTasks);

  const allTasks = useMemo(() => {
    const tasks = [];
    boards.forEach(board => {
      board.columns.forEach(column => {
        column.tasks.forEach(task => {
          tasks.push({ ...task, boardName: board.name, columnName: column.title });
        });
      });
    });
    standaloneTasks.forEach(task => {
      tasks.push({ ...task, boardName: 'Standalone' });
    });
    return tasks;
  }, [boards, standaloneTasks]);

  const fuse = useMemo(() => {
    return new Fuse(allTasks, {
      keys: ['heading', 'description', 'extendedData.comments.text'],
      includeMatches: true,
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [allTasks]);

  const search = (query) => {
    if (!query) {
      return [];
    }
    return fuse.search(query);
  };

  return { search };
};

export default useSearch;
