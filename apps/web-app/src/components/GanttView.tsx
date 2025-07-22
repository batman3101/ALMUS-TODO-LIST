import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useTasks } from '../hooks/useTasks';
import {
  Task,
  GanttTask,
  ZoomLevel,
  GanttViewConfig,
} from '@almus/shared-types';
import { useAuth } from '../hooks/useAuth';

const GanttView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // 현재 날짜를 실시간으로 가져오는 함수
  const getCurrentDate = () => new Date();

  const [config, setConfig] = useState<GanttViewConfig>(() => {
    const now = getCurrentDate();
    return {
      zoomLevel: ZoomLevel.WEEK,
      showDependencies: true,
      showProgress: true,
      showDelayedTasks: true,
      dateRange: {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth() + 2, 0),
      },
    };
  });

  const {
    data: tasks,
    isLoading,
    error,
  } = useTasks({
    teamId: user?.teamId || '',
  });

  // 진행률 계산 함수
  const calculateTaskProgress = (
    task: Task,
    startDate: Date,
    endDate: Date
  ) => {
    // 완료된 태스크는 무조건 100%
    if (task.status === 'DONE') {
      return 100;
    }

    const now = new Date();
    const totalDuration = endDate.getTime() - startDate.getTime();

    // 아직 시작하지 않은 태스크
    if (now < startDate) {
      return 0;
    }

    // 기한이 지난 태스크
    if (now > endDate) {
      // 기존 progress가 있으면 그것을 사용, 없으면 100%
      return task.progress || 100;
    }

    // 현재 진행 중인 태스크의 시간 기반 진행률 계산
    const elapsedDuration = now.getTime() - startDate.getTime();
    const timeBasedProgress = Math.round(
      (elapsedDuration / totalDuration) * 100
    );

    // 기존 progress와 시간 기반 progress 중 더 높은 값 사용
    return Math.max(task.progress || 0, timeBasedProgress);
  };

  // Task를 GanttTask로 변환
  const ganttTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.map((task: Task): GanttTask => {
      const startDate = task.startDate || task.createdAt;
      const endDate =
        task.endDate ||
        task.dueDate ||
        new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isDelayed = task.dueDate
        ? new Date() > task.dueDate && task.status !== 'DONE'
        : false;
      const isOverdue = task.dueDate ? new Date() > task.dueDate : false;

      // 계산된 진행률 적용
      const calculatedProgress = calculateTaskProgress(
        task,
        startDate,
        endDate
      );

      // 디버깅 정보 (개발 시에만)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Progress calculation for: ${task.title}`, {
          originalProgress: task.progress,
          calculatedProgress,
          status: task.status,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          now: new Date().toISOString(),
        });
      }

      return {
        id: task.id,
        title: task.title,
        startDate,
        endDate,
        progress: calculatedProgress,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dependencies: task.dependencies || [],
        isDelayed,
        isOverdue,
      };
    });
  }, [tasks]);

  // 실제 주차 계산 함수 (ISO 8601 기준)
  const getWeekNumber = (date: Date): { year: number; week: number } => {
    const target = new Date(date);
    const dayNr = (target.getDay() + 6) % 7; // 월요일을 0으로 하는 요일
    target.setDate(target.getDate() - dayNr + 3); // 해당 주의 목요일로 이동
    const jan4 = new Date(target.getFullYear(), 0, 4); // 1월 4일
    const dayDiff = (target.getTime() - jan4.getTime()) / 86400000; // 일 단위 차이
    const weekNum = 1 + Math.round((dayDiff - 3 + (jan4.getDay() + 6) % 7) / 7);
    return { year: target.getFullYear(), week: weekNum };
  };

  // 날짜 범위를 시간 단위 경계에 정렬하는 유틸리티 함수들
  const alignToWeekBoundary = (date: Date): Date => {
    const result = new Date(date);
    // 월요일(1)로 정렬, getDay()는 일요일=0, 월요일=1
    const dayOfWeek = result.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6일 빼고, 나머지는 (요일-1)일 빼기
    result.setDate(result.getDate() - daysToSubtract);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const alignToMonthBoundary = (date: Date): Date => {
    const result = new Date(date);
    result.setDate(1); // 해당 월 1일로 설정
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const alignToQuarterBoundary = (date: Date): Date => {
    const result = new Date(date);
    const quarterStartMonth = Math.floor(result.getMonth() / 3) * 3;
    result.setMonth(quarterStartMonth, 1); // 분기 첫 달 1일로 설정
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const alignToYearBoundary = (date: Date): Date => {
    const result = new Date(date);
    result.setMonth(0, 1); // 해당 연도 1월 1일로 설정
    result.setHours(0, 0, 0, 0);
    return result;
  };

  // 시간 단위 정보 인터페이스
  interface TimeUnitInfo {
    date: Date;
    label: string;
    type: string;
  }

  // 공통 시간 단위 생성 함수 (라벨 포함)
  const generateTimeUnits = (
    start: Date,
    end: Date,
    zoomLevel: ZoomLevel
  ): TimeUnitInfo[] => {
    const units: TimeUnitInfo[] = [];

    switch (zoomLevel) {
      case ZoomLevel.DAY: {
        // 일 단위: 정확한 날짜별로 표시
        const dayStart = new Date(start);
        let dayIterator = new Date(dayStart);

        while (dayIterator <= end) {
          units.push({
            date: new Date(dayIterator),
            label: format(dayIterator, 'MM/dd'),
            type: 'day',
          });
          dayIterator = new Date(dayIterator);
          dayIterator.setDate(dayIterator.getDate() + 1);
        }
        break;
      }

      case ZoomLevel.WEEK: {
        // 주 단위: 실제 주차 기준으로 표시
        const weekStart = alignToWeekBoundary(start);
        let weekIterator = new Date(weekStart);

        while (weekIterator <= end) {
          const weekInfo = getWeekNumber(weekIterator);
          
          units.push({
            date: new Date(weekIterator),
            label: `${weekInfo.year}년\n${weekInfo.week}주`,
            type: 'week',
          });
          weekIterator = new Date(weekIterator);
          weekIterator.setDate(weekIterator.getDate() + 7);
        }
        break;
      }

      case ZoomLevel.MONTH: {
        // 월 단위: 정확한 월의 1일 기준으로 표시
        const monthStart = alignToMonthBoundary(start);
        let monthIterator = new Date(monthStart);

        while (monthIterator <= end) {
          units.push({
            date: new Date(monthIterator),
            label: format(monthIterator, 'yyyy/MM'),
            type: 'month',
          });
          monthIterator = new Date(monthIterator);
          monthIterator.setMonth(monthIterator.getMonth() + 1);
        }
        break;
      }

      case ZoomLevel.QUARTER: {
        // 분기 단위: 분기의 첫 달 1일 기준으로 표시
        const quarterStart = alignToQuarterBoundary(start);
        let quarterIterator = new Date(quarterStart);

        while (quarterIterator <= end) {
          const quarter = Math.floor(quarterIterator.getMonth() / 3) + 1;
          units.push({
            date: new Date(quarterIterator),
            label: `${quarterIterator.getFullYear()} Q${quarter}`,
            type: 'quarter',
          });
          quarterIterator = new Date(quarterIterator);
          quarterIterator.setMonth(quarterIterator.getMonth() + 3);
        }
        break;
      }

      case ZoomLevel.YEAR: {
        // 년 단위: 해당 년도 1월 1일 기준으로 표시
        const yearStart = alignToYearBoundary(start);
        let yearIterator = new Date(yearStart);

        while (yearIterator <= end) {
          units.push({
            date: new Date(yearIterator),
            label: format(yearIterator, 'yyyy'),
            type: 'year',
          });
          yearIterator = new Date(yearIterator);
          yearIterator.setFullYear(yearIterator.getFullYear() + 1);
        }
        break;
      }

      default: {
        // 기본값: 주 단위로 처리
        const defaultWeekStart = alignToWeekBoundary(start);
        let defaultIterator = new Date(defaultWeekStart);
        while (defaultIterator <= end) {
          units.push({
            date: new Date(defaultIterator),
            label: `${format(defaultIterator, 'MM/dd')}주`,
            type: 'week',
          });
          defaultIterator = new Date(defaultIterator);
          defaultIterator.setDate(defaultIterator.getDate() + 7);
        }
      }
    }

    return units;
  };

  // 실제 시간 단위 개수를 계산하는 함수 (공통 함수 사용)
  const calculateActualTimeUnits = (
    start: Date,
    end: Date,
    zoomLevel: ZoomLevel
  ): number => {
    return generateTimeUnits(start, end, zoomLevel).length;
  };

  // 차트 최소 너비 계산 (실제 시간 단위 기간 사용)
  const chartMinWidth = useMemo(() => {
    const { start, end } = config.dateRange;

    // 실제 시간 단위 개수 계산
    const actualUnits = calculateActualTimeUnits(start, end, config.zoomLevel);

    // 각 시간 단위당 최소 너비 설정 (줌 레벨별로 다르게)
    let minWidthPerUnit = 60;
    switch (config.zoomLevel) {
      case ZoomLevel.DAY: {
        minWidthPerUnit = 50; // 일 단위는 좁게
        break;
      }
      case ZoomLevel.WEEK: {
        minWidthPerUnit = 80; // 주 단위는 중간
        break;
      }
      case ZoomLevel.MONTH: {
        minWidthPerUnit = 100; // 월 단위는 넓게
        break;
      }
      case ZoomLevel.QUARTER: {
        minWidthPerUnit = 120; // 분기 단위는 더 넓게
        break;
      }
      case ZoomLevel.YEAR: {
        minWidthPerUnit = 150; // 년 단위는 가장 넓게
        break;
      }
    }

    return Math.max(800, actualUnits * minWidthPerUnit);
  }, [config.dateRange, config.zoomLevel]);

  const handleZoomChange = (zoomLevel: ZoomLevel) => {
    const now = getCurrentDate(); // 실시간 현재 날짜 사용
    let start: Date;
    let end: Date;

    // 줌 레벨에 따라 적절한 날짜 범위 설정 (경계에 정렬)
    switch (zoomLevel) {
      case ZoomLevel.DAY: {
        // 현재 월 기준으로 이전달부터 다음달까지 (3개월 범위)
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 2, 0); // 다음다음달 0일 = 다음달 마지막 날
        break;
      }

      case ZoomLevel.WEEK: {
        // 3주 전 월요일부터 9주 후 일요일까지
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 21); // 3주 전
        start = alignToWeekBoundary(weekStart);

        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + 63); // 9주 후
        const alignedWeekEnd = alignToWeekBoundary(weekEnd);
        end = new Date(alignedWeekEnd);
        end.setDate(end.getDate() + 6); // 해당 주의 일요일까지
        end.setHours(23, 59, 59, 999);
        break;
      }

      case ZoomLevel.MONTH: {
        // 2개월 전 1일부터 10개월 후 말일까지
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 2);
        start = alignToMonthBoundary(monthStart);

        const monthEnd = new Date(now);
        monthEnd.setMonth(now.getMonth() + 10);
        end = alignToMonthBoundary(monthEnd);
        end.setMonth(end.getMonth() + 1); // 다음 달로 이동
        end.setDate(0); // 이전 달 마지막 날
        end.setHours(23, 59, 59, 999);
        break;
      }

      case ZoomLevel.QUARTER: {
        // 2분기 전부터 6분기 후까지
        const quarterStart = new Date(now);
        quarterStart.setMonth(now.getMonth() - 6); // 6개월 전
        start = alignToQuarterBoundary(quarterStart);

        const quarterEnd = new Date(now);
        quarterEnd.setMonth(now.getMonth() + 18); // 18개월 후
        end = alignToQuarterBoundary(quarterEnd);
        end.setMonth(end.getMonth() + 3); // 다음 분기로 이동
        end.setDate(0); // 이전 달 마지막 날
        end.setHours(23, 59, 59, 999);
        break;
      }

      case ZoomLevel.YEAR: {
        // 1년 전부터 4년 후까지
        const yearStart = new Date(now);
        yearStart.setFullYear(now.getFullYear() - 1);
        start = alignToYearBoundary(yearStart);

        const yearEnd = new Date(now);
        yearEnd.setFullYear(now.getFullYear() + 4);
        end = alignToYearBoundary(yearEnd);
        end.setFullYear(end.getFullYear() + 1); // 다음 년도로 이동
        end.setDate(0); // 작년 12월 31일
        end.setHours(23, 59, 59, 999);
        break;
      }

      default: {
        // 기본값: 주 단위 처리와 동일
        const defaultStart = new Date(now);
        defaultStart.setDate(now.getDate() - 30);
        start = alignToWeekBoundary(defaultStart);

        const defaultEnd = new Date(now);
        defaultEnd.setDate(now.getDate() + 60);
        const alignedDefaultEnd = alignToWeekBoundary(defaultEnd);
        end = new Date(alignedDefaultEnd);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      }
    }

    setConfig(prev => ({
      ...prev,
      zoomLevel,
      dateRange: { start, end },
    }));
  };

  // 스크롤 동기화 - 차트 영역에서 타임라인으로
  const handleChartScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (timelineRef.current && timelineRef.current.scrollLeft !== scrollLeft) {
      timelineRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  // 스크롤 동기화 - 타임라인에서 차트 영역으로
  const handleTimelineScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollLeft = e.currentTarget.scrollLeft;
      if (
        scrollContainerRef.current &&
        scrollContainerRef.current.scrollLeft !== scrollLeft
      ) {
        scrollContainerRef.current.scrollLeft = scrollLeft;
      }
    },
    []
  );

  // 오늘 날짜로 이동 (시간 단위 기반 정확한 계산)
  const scrollToToday = useCallback(() => {
    const today = getCurrentDate(); // 실시간 현재 날짜 사용
    const { start, end } = config.dateRange;
    
    // 타임라인과 동일한 시간 단위 생성으로 정확한 위치 계산
    const timeUnits = generateTimeUnits(start, end, config.zoomLevel);
    const totalMs = end.getTime() - start.getTime();
    
    // 시간 단위 기반으로 오늘 날짜의 위치 계산
    const calculateTodayPosition = (): number => {
      if (today <= start) return 0;
      if (today >= end) return 100;
      
      let cumulativePosition = 0;
      
      for (let i = 0; i < timeUnits.length; i++) {
        const currentUnit = timeUnits[i];
        const nextUnit = timeUnits[i + 1];
        const unitEndDate = nextUnit ? nextUnit.date : end;
        
        // 현재 시간 단위의 실제 기간과 화면상 너비 비율 계산
        const unitDurationMs = unitEndDate.getTime() - currentUnit.date.getTime();
        const unitWidthPercentage = (unitDurationMs / totalMs) * 100;
        
        // 오늘 날짜가 현재 시간 단위 내에 있는지 확인
        if (today >= currentUnit.date && today < unitEndDate) {
          // 시간 단위 내에서의 상대적 위치 계산
          const relativePositionMs = today.getTime() - currentUnit.date.getTime();
          const relativePositionPercentage = (relativePositionMs / unitDurationMs) * unitWidthPercentage;
          return cumulativePosition + relativePositionPercentage;
        }
        
        cumulativePosition += unitWidthPercentage;
      }
      
      return cumulativePosition;
    };

    const todayPositionPercentage = calculateTodayPosition();

    if (scrollContainerRef.current) {
      const scrollWidth = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
      const containerWidth = scrollContainerRef.current.clientWidth;
      
      // 오늘 날짜를 화면 중앙에 위치시키기 위한 스크롤 위치 계산
      const todayPixelPosition = (todayPositionPercentage / 100) * scrollContainerRef.current.scrollWidth;
      const targetScrollLeft = todayPixelPosition - (containerWidth / 2);

      scrollContainerRef.current.scrollTo({
        left: Math.max(0, Math.min(scrollWidth, targetScrollLeft)),
        behavior: 'smooth',
      });
    }
  }, [config.dateRange, config.zoomLevel]);

  const renderTimeline = () => {
    const { start, end } = config.dateRange;
    
    // 공통 함수를 사용하여 시간 단위 생성
    const timeUnits = generateTimeUnits(start, end, config.zoomLevel);

    const totalMs = end.getTime() - start.getTime();

    // 디버깅 정보 (개발 시에만)
    if (process.env.NODE_ENV === 'development') {
      console.log('Timeline render:', {
        rangeStart: start.toISOString(),
        rangeEnd: end.toISOString(),
        totalMs,
        timeUnitsCount: timeUnits.length,
        chartMinWidth,
        zoomLevel: config.zoomLevel,
      });
    }

    return (
      <div className="border-b-2 border-gray-300 dark:border-dark-400 bg-gray-100 dark:bg-dark-200">
        <div className="flex" style={{ minWidth: `${chartMinWidth}px` }}>
          {timeUnits.map((unit, i) => {
            // 다음 시간 단위까지의 실제 기간 계산
            const nextUnit = timeUnits[i + 1];
            const unitEndDate = nextUnit ? nextUnit.date : end;
            const unitDurationMs = unitEndDate.getTime() - unit.date.getTime();
            const widthPercentage = (unitDurationMs / totalMs) * 100;

            return (
              <div
                key={i}
                className="text-sm font-semibold text-gray-700 dark:text-dark-700 border-r-2 border-gray-300 dark:border-dark-400 p-2 text-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-dark-100 dark:to-dark-200"
                style={{
                  width: `${widthPercentage}%`,
                  minWidth: `${widthPercentage}%`,
                  flexShrink: 0,
                }}
              >
                <div className="font-bold text-primary-600 dark:text-primary-400 text-xs whitespace-pre-line">
                  {unit.label}
                </div>
                {unit.type === 'day' && (
                  <div className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                    {format(unit.date, 'E')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTaskBar = (task: GanttTask) => {
    const { start, end } = config.dateRange;

    // 타임라인과 동일한 시간 단위 생성
    const timeUnits = generateTimeUnits(start, end, config.zoomLevel);
    const totalMs = end.getTime() - start.getTime();

    // 시간 단위 기반 위치 계산 함수
    const calculateTimeUnitBasedPosition = (targetDate: Date): number => {
      if (targetDate <= start) return 0;
      if (targetDate >= end) return 100;

      let cumulativePosition = 0;

      for (let i = 0; i < timeUnits.length; i++) {
        const currentUnit = timeUnits[i];
        const nextUnit = timeUnits[i + 1];
        const unitEndDate = nextUnit ? nextUnit.date : end;

        // 현재 시간 단위의 실제 기간과 화면상 너비 비율 계산
        const unitDurationMs =
          unitEndDate.getTime() - currentUnit.date.getTime();
        const unitWidthPercentage = (unitDurationMs / totalMs) * 100;

        // 타겟 날짜가 현재 시간 단위 내에 있는지 확인
        if (targetDate >= currentUnit.date && targetDate < unitEndDate) {
          // 시간 단위 내에서의 상대적 위치 계산
          const relativePositionMs =
            targetDate.getTime() - currentUnit.date.getTime();
          const relativePositionPercentage =
            (relativePositionMs / unitDurationMs) * unitWidthPercentage;
          return cumulativePosition + relativePositionPercentage;
        }

        cumulativePosition += unitWidthPercentage;
      }

      return cumulativePosition;
    };

    // 시간 단위 기반으로 정확한 위치와 크기 계산
    const leftPosition = calculateTimeUnitBasedPosition(task.startDate);
    const rightPosition = calculateTimeUnitBasedPosition(task.endDate);
    const left = Math.max(0, leftPosition);
    const width = Math.max(0.5, rightPosition - leftPosition); // 최소 0.5% 너비 보장

    // 디버깅 정보 (개발 시에만)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Task: ${task.title} (Time-Unit Based)`, {
        startDate: task.startDate.toISOString(),
        endDate: task.endDate.toISOString(),
        rangeStart: start.toISOString(),
        rangeEnd: end.toISOString(),
        zoomLevel: config.zoomLevel,
        timeUnitsCount: timeUnits.length,
        leftPosition: leftPosition.toFixed(2),
        rightPosition: rightPosition.toFixed(2),
        left: left.toFixed(2),
        width: width.toFixed(2),
      });
    }

    // 태스크가 범위를 완전히 벗어나는 경우 처리
    if (task.endDate < start || task.startDate > end) {
      return null; // 범위 밖의 태스크는 표시하지 않음
    }

    // 부분적으로 보이는 태스크의 경우 보정
    const visibleLeft = Math.max(0, left);
    const visibleRight = Math.min(100, left + width);
    const visibleWidth = Math.max(0.5, visibleRight - visibleLeft);

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'TODO':
          return 'bg-gray-400 dark:bg-gray-500';
        case 'IN_PROGRESS':
          return 'bg-blue-500 dark:bg-blue-600';
        case 'REVIEW':
          return 'bg-yellow-500 dark:bg-yellow-600';
        case 'DONE':
          return 'bg-green-500 dark:bg-green-600';
        default:
          return 'bg-gray-400 dark:bg-gray-500';
      }
    };

    const getPriorityBorder = (priority: string) => {
      switch (priority) {
        case 'LOW':
          return 'border-l-4 border-l-gray-300';
        case 'MEDIUM':
          return 'border-l-4 border-l-blue-400';
        case 'HIGH':
          return 'border-l-4 border-l-orange-400';
        case 'URGENT':
          return 'border-l-4 border-l-red-500';
        default:
          return 'border-l-4 border-l-gray-300';
      }
    };

    return (
      <div className="absolute inset-0">
        <div
          className={`absolute h-16 rounded shadow-sm ${getStatusColor(task.status)} ${getPriorityBorder(task.priority)} ${
            task.isDelayed ? 'ring-2 ring-red-500 ring-opacity-50' : ''
          } transition-all duration-200 hover:shadow-md cursor-pointer group`}
          style={{
            left: `${visibleLeft}%`,
            width: `${visibleWidth}%`,
            top: '50%',
            transform: 'translateY(-50%)', // 수직 중앙 정렬
          }}
          title={`${task.title} (${format(task.startDate, 'yyyy/MM/dd')} - ${format(task.endDate, 'yyyy/MM/dd')})`}
        >
          {/* 진행률 표시 */}
          {config.showProgress && task.progress > 0 && (
            <div
              className="absolute top-0 left-0 h-full bg-white bg-opacity-30 rounded-l"
              style={{ width: `${task.progress}%` }}
            />
          )}

          <div className="flex items-center justify-between px-2 h-full text-white text-xs font-medium">
            <span className="truncate flex-1">{task.title}</span>
            <div className="flex items-center gap-1">
              {config.showProgress && task.progress > 0 && (
                <span className="text-xs bg-black bg-opacity-30 px-1 rounded">
                  {task.progress}%
                </span>
              )}
              <span className="text-xs bg-black bg-opacity-50 px-1 rounded">
                {format(task.startDate, 'MM/dd')}~
                {format(task.endDate, 'MM/dd')}
              </span>
            </div>
          </div>

          {/* 호버 시 상세 정보 */}
          <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
            <div>{task.title}</div>
            <div>
              기간: {format(task.startDate, 'MM/dd')} -{' '}
              {format(task.endDate, 'MM/dd')}
            </div>
            <div>상태: {task.status}</div>
            <div>진행률: {task.progress}%</div>
            {task.isDelayed && <div className="text-red-400">지연됨</div>}
          </div>
        </div>

        {/* 의존성 표시 */}
        {config.showDependencies &&
          task.dependencies &&
          task.dependencies.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {task.dependencies.map(depId => {
                const depTask = ganttTasks.find(t => t.id === depId);
                if (!depTask) return null;

                // 의존 태스크의 종료 지점 계산
                const depEndMs = depTask.endDate.getTime() - start.getTime();
                const depEndLeft = Math.max(0, (depEndMs / totalMs) * 100);

                return (
                  <svg
                    key={depId}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                  >
                    <defs>
                      <marker
                        id={`arrowhead-${depId}`}
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="#ef4444"
                          className="opacity-70"
                        />
                      </marker>
                    </defs>
                    <line
                      x1={`${depEndLeft}%`}
                      y1="50%"
                      x2={`${visibleLeft}%`}
                      y2="50%"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="4,2"
                      markerEnd={`url(#arrowhead-${depId})`}
                      className="opacity-70"
                    />
                  </svg>
                );
              })}
            </div>
          )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-gray-900 dark:text-dark-900">로딩 중...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400">
        오류가 발생했습니다: {error.message}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
          {t('view.gantt')}
        </h2>

        <div className="flex space-x-2">
          <button
            onClick={scrollToToday}
            className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm transition-colors duration-200 font-medium"
            title="오늘 날짜로 이동"
          >
            오늘
          </button>

          <select
            value={config.zoomLevel}
            onChange={e => handleZoomChange(e.target.value as ZoomLevel)}
            className="px-3 py-1 border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <option value={ZoomLevel.DAY}>일</option>
            <option value={ZoomLevel.WEEK}>주</option>
            <option value={ZoomLevel.MONTH}>월</option>
            <option value={ZoomLevel.QUARTER}>분기</option>
            <option value={ZoomLevel.YEAR}>년</option>
          </select>

          <label className="flex items-center space-x-2 text-sm text-gray-900 dark:text-dark-900">
            <input
              type="checkbox"
              checked={config.showDependencies}
              onChange={e =>
                setConfig(prev => ({
                  ...prev,
                  showDependencies: e.target.checked,
                }))
              }
              className="rounded border-gray-300 dark:border-dark-300 text-primary-600 focus:ring-primary-500"
            />
            <span>의존성 표시</span>
          </label>

          <label className="flex items-center space-x-2 text-sm text-gray-900 dark:text-dark-900">
            <input
              type="checkbox"
              checked={config.showProgress}
              onChange={e =>
                setConfig(prev => ({ ...prev, showProgress: e.target.checked }))
              }
              className="rounded border-gray-300 dark:border-dark-300 text-primary-600 focus:ring-primary-500"
            />
            <span>진행률 표시</span>
          </label>
        </div>
      </div>

      <div className="border-2 border-gray-300 dark:border-dark-400 rounded-lg">
        {/* 헤더 영역 */}
        <div className="flex bg-gray-200 dark:bg-dark-300 border-b-2 border-gray-300 dark:border-dark-400">
          {/* 태스크 목록 헤더 */}
          <div className="w-96 flex-shrink-0 p-4 border-r-2 border-gray-300 dark:border-dark-400 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-dark-200 dark:to-dark-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-dark-800">
                📋 태스크 목록
              </h3>
              <div className="text-sm text-gray-600 dark:text-dark-600">
                총 {ganttTasks.length}개
              </div>
            </div>
          </div>
          {/* 날짜 헤더 */}
          <div
            className="flex-1 overflow-x-auto"
            ref={timelineRef}
            onScroll={handleTimelineScroll}
          >
            {renderTimeline()}
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="flex">
          {/* 왼쪽: 태스크 목록 */}
          <div className="w-96 flex-shrink-0 border-r-2 border-gray-300 dark:border-dark-400 bg-gray-50 dark:bg-dark-100">
            {ganttTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-dark-500">
                태스크가 없습니다
              </div>
            ) : (
              <div>
                {ganttTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`border-b border-gray-200 dark:border-dark-300 p-4 flex items-center ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-dark-50'
                        : 'bg-gray-100 dark:bg-dark-100'
                    } hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}
                    style={{ height: '140px' }}
                  >
                    <div className="flex items-start justify-between h-full">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-4 h-4 rounded-full flex-shrink-0 ${
                              task.status === 'TODO'
                                ? 'bg-gray-400'
                                : task.status === 'IN_PROGRESS'
                                  ? 'bg-blue-500'
                                  : task.status === 'REVIEW'
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                            }`}
                          />
                          <span className="text-sm font-bold text-gray-900 dark:text-dark-900 break-words">
                            {task.title}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-dark-600 mb-2 space-y-1">
                          <div>
                            📅 시작: {format(task.startDate, 'yyyy/MM/dd')}
                          </div>
                          <div>
                            ⏰ 마감: {format(task.endDate, 'yyyy/MM/dd')}
                          </div>
                          <div>👤 담당: {task.assigneeId}</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span
                            className={`px-2 py-1 rounded text-white font-medium ${
                              task.priority === 'LOW'
                                ? 'bg-gray-400'
                                : task.priority === 'MEDIUM'
                                  ? 'bg-blue-500'
                                  : task.priority === 'HIGH'
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-white font-medium ${
                              task.status === 'TODO'
                                ? 'bg-gray-500'
                                : task.status === 'IN_PROGRESS'
                                  ? 'bg-blue-600'
                                  : task.status === 'REVIEW'
                                    ? 'bg-yellow-600'
                                    : 'bg-green-600'
                            }`}
                          >
                            {task.status}
                          </span>
                          {task.isDelayed && (
                            <span className="px-2 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded font-medium">
                              지연
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                          {task.progress}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-dark-500">
                          진행률
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 오른쪽: 간트 차트 */}
          <div
            className="flex-1 overflow-x-auto"
            ref={scrollContainerRef}
            onScroll={handleChartScroll}
          >
            {/* 태스크 바들 */}
            <div
              className="relative bg-white dark:bg-dark-50"
              style={{ minWidth: `${chartMinWidth}px` }}
            >
              {ganttTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-dark-400">
                  태스크를 추가해주세요
                </div>
              ) : (
                ganttTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`relative border-b border-gray-200 dark:border-dark-300 ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-dark-50'
                        : 'bg-gray-50 dark:bg-dark-100'
                    } hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}
                    style={{ height: '140px' }}
                  >
                    {renderTaskBar(task)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
