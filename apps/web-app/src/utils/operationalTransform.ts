// Operational Transform (OT) 알고리즘 구현
// 동시 편집 시 발생하는 충돌을 해결하기 위한 핵심 알고리즘

export type OperationType = 'retain' | 'insert' | 'delete';

export interface Operation {
  type: OperationType;
  length?: number; // retain, delete의 경우 길이
  text?: string; // insert의 경우 삽입할 텍스트
  attributes?: Record<string, any>; // 서식 정보
}

export interface TextOperation {
  ops: Operation[];
  baseLength: number;
  targetLength: number;
}

export class OperationalTransform {
  /**
   * 두 개의 작업을 변환하여 동시 편집 충돌을 해결
   * @param op1 첫 번째 작업
   * @param op2 두 번째 작업
   * @param priority1 첫 번째 작업의 우선순위 (높을수록 우선)
   * @returns 변환된 두 작업
   */
  static transform(
    op1: TextOperation,
    op2: TextOperation,
    priority1: boolean = true
  ): [TextOperation, TextOperation] {
    if (op1.baseLength !== op2.baseLength) {
      throw new Error('Operations must have the same base length');
    }

    const ops1 = op1.ops.slice();
    const ops2 = op2.ops.slice();
    const newOps1: Operation[] = [];
    const newOps2: Operation[] = [];

    let i1 = 0,
      i2 = 0; // 현재 처리 중인 operation 인덱스
    let offset1 = 0,
      offset2 = 0; // 현재 처리 중인 위치

    while (i1 < ops1.length || i2 < ops2.length) {
      // 첫 번째 작업이 끝난 경우
      if (i1 >= ops1.length) {
        newOps2.push(...ops2.slice(i2));
        break;
      }

      // 두 번째 작업이 끝난 경우
      if (i2 >= ops2.length) {
        newOps1.push(...ops1.slice(i1));
        break;
      }

      const op1Current = ops1[i1];
      const op2Current = ops2[i2];

      // Insert vs Insert
      if (op1Current.type === 'insert' && op2Current.type === 'insert') {
        if (priority1) {
          newOps1.push(op1Current);
          newOps2.push({ type: 'retain', length: op1Current.text!.length });
          i1++;
        } else {
          newOps1.push({ type: 'retain', length: op2Current.text!.length });
          newOps2.push(op2Current);
          i2++;
        }
      }
      // Insert vs Retain
      else if (op1Current.type === 'insert' && op2Current.type === 'retain') {
        newOps1.push(op1Current);
        newOps2.push({ type: 'retain', length: op1Current.text!.length });
        i1++;
      }
      // Insert vs Delete
      else if (op1Current.type === 'insert' && op2Current.type === 'delete') {
        newOps1.push(op1Current);
        newOps2.push({ type: 'retain', length: op1Current.text!.length });
        i1++;
      }
      // Retain vs Insert
      else if (op1Current.type === 'retain' && op2Current.type === 'insert') {
        newOps1.push({ type: 'retain', length: op2Current.text!.length });
        newOps2.push(op2Current);
        i2++;
      }
      // Retain vs Retain
      else if (op1Current.type === 'retain' && op2Current.type === 'retain') {
        const minLength = Math.min(op1Current.length!, op2Current.length!);
        newOps1.push({ type: 'retain', length: minLength });
        newOps2.push({ type: 'retain', length: minLength });

        // 남은 길이 처리
        if (op1Current.length! > minLength) {
          ops1[i1] = { ...op1Current, length: op1Current.length! - minLength };
        } else {
          i1++;
        }

        if (op2Current.length! > minLength) {
          ops2[i2] = { ...op2Current, length: op2Current.length! - minLength };
        } else {
          i2++;
        }
      }
      // Delete vs Insert
      else if (op1Current.type === 'delete' && op2Current.type === 'insert') {
        newOps2.push(op2Current);
        i2++;
      }
      // Delete vs Retain
      else if (op1Current.type === 'delete' && op2Current.type === 'retain') {
        const minLength = Math.min(op1Current.length!, op2Current.length!);
        newOps1.push({ type: 'delete', length: minLength });

        // 남은 길이 처리
        if (op1Current.length! > minLength) {
          ops1[i1] = { ...op1Current, length: op1Current.length! - minLength };
        } else {
          i1++;
        }

        if (op2Current.length! > minLength) {
          ops2[i2] = { ...op2Current, length: op2Current.length! - minLength };
        } else {
          i2++;
        }
      }
      // Delete vs Delete
      else if (op1Current.type === 'delete' && op2Current.type === 'delete') {
        const minLength = Math.min(op1Current.length!, op2Current.length!);

        // 남은 길이 처리
        if (op1Current.length! > minLength) {
          ops1[i1] = { ...op1Current, length: op1Current.length! - minLength };
        } else {
          i1++;
        }

        if (op2Current.length! > minLength) {
          ops2[i2] = { ...op2Current, length: op2Current.length! - minLength };
        } else {
          i2++;
        }
      }
      // Retain vs Delete
      else if (op1Current.type === 'retain' && op2Current.type === 'delete') {
        const minLength = Math.min(op1Current.length!, op2Current.length!);
        newOps2.push({ type: 'delete', length: minLength });

        // 남은 길이 처리
        if (op1Current.length! > minLength) {
          ops1[i1] = { ...op1Current, length: op1Current.length! - minLength };
        } else {
          i1++;
        }

        if (op2Current.length! > minLength) {
          ops2[i2] = { ...op2Current, length: op2Current.length! - minLength };
        } else {
          i2++;
        }
      }
    }

    return [
      {
        ops: this.normalize(newOps1),
        baseLength: op1.baseLength,
        targetLength: this.calculateTargetLength(op1.baseLength, newOps1),
      },
      {
        ops: this.normalize(newOps2),
        baseLength: op2.baseLength,
        targetLength: this.calculateTargetLength(op2.baseLength, newOps2),
      },
    ];
  }

  /**
   * 작업을 텍스트에 적용
   * @param text 원본 텍스트
   * @param operation 적용할 작업
   * @returns 변경된 텍스트
   */
  static apply(text: string, operation: TextOperation): string {
    if (text.length !== operation.baseLength) {
      throw new Error('Text length does not match operation base length');
    }

    let result = '';
    let textIndex = 0;

    for (const op of operation.ops) {
      switch (op.type) {
        case 'retain':
          result += text.slice(textIndex, textIndex + op.length!);
          textIndex += op.length!;
          break;
        case 'insert':
          result += op.text!;
          break;
        case 'delete':
          textIndex += op.length!;
          break;
      }
    }

    return result;
  }

  /**
   * 작업들을 정규화하여 연속된 같은 타입의 작업을 합침
   * @param ops 작업 배열
   * @returns 정규화된 작업 배열
   */
  static normalize(ops: Operation[]): Operation[] {
    const normalized: Operation[] = [];

    for (const op of ops) {
      if (op.type === 'retain' && op.length === 0) continue;
      if (op.type === 'delete' && op.length === 0) continue;
      if (op.type === 'insert' && op.text === '') continue;

      const last = normalized[normalized.length - 1];

      if (last && last.type === op.type) {
        if (op.type === 'retain' || op.type === 'delete') {
          last.length = (last.length || 0) + (op.length || 0);
        } else if (op.type === 'insert') {
          last.text = (last.text || '') + (op.text || '');
        }
      } else {
        normalized.push({ ...op });
      }
    }

    return normalized;
  }

  /**
   * 작업의 대상 길이 계산
   * @param baseLength 원본 길이
   * @param ops 작업 배열
   * @returns 대상 길이
   */
  static calculateTargetLength(baseLength: number, ops: Operation[]): number {
    let length = baseLength;

    for (const op of ops) {
      switch (op.type) {
        case 'insert':
          length += op.text!.length;
          break;
        case 'delete':
          length -= op.length!;
          break;
      }
    }

    return length;
  }

  /**
   * 작업을 역전시킴
   * @param operation 원본 작업
   * @param text 원본 텍스트
   * @returns 역전된 작업
   */
  static invert(operation: TextOperation, text: string): TextOperation {
    const inverted: Operation[] = [];
    let textIndex = 0;

    for (const op of operation.ops) {
      switch (op.type) {
        case 'retain':
          inverted.push({ type: 'retain', length: op.length });
          textIndex += op.length!;
          break;
        case 'insert':
          inverted.push({ type: 'delete', length: op.text!.length });
          break;
        case 'delete':
          const deletedText = text.slice(textIndex, textIndex + op.length!);
          inverted.push({ type: 'insert', text: deletedText });
          textIndex += op.length!;
          break;
      }
    }

    return {
      ops: this.normalize(inverted),
      baseLength: operation.targetLength,
      targetLength: operation.baseLength,
    };
  }

  /**
   * 여러 작업을 하나로 합성
   * @param op1 첫 번째 작업
   * @param op2 두 번째 작업
   * @returns 합성된 작업
   */
  static compose(op1: TextOperation, op2: TextOperation): TextOperation {
    if (op1.targetLength !== op2.baseLength) {
      throw new Error(
        'Cannot compose operations: target length of first operation must equal base length of second operation'
      );
    }

    const ops1 = op1.ops.slice();
    const ops2 = op2.ops.slice();
    const composed: Operation[] = [];

    let i1 = 0,
      i2 = 0;

    while (i1 < ops1.length || i2 < ops2.length) {
      if (i1 >= ops1.length) {
        composed.push(...ops2.slice(i2));
        break;
      }

      if (i2 >= ops2.length) {
        const remaining = ops1.slice(i1);
        for (const op of remaining) {
          if (op.type !== 'delete') {
            composed.push(op);
          }
        }
        break;
      }

      const op1Current = ops1[i1];
      const op2Current = ops2[i2];

      if (op1Current.type === 'delete') {
        composed.push(op1Current);
        i1++;
      } else if (op2Current.type === 'insert') {
        composed.push(op2Current);
        i2++;
      } else if (op1Current.type === 'retain' && op2Current.type === 'retain') {
        const minLength = Math.min(op1Current.length!, op2Current.length!);
        composed.push({ type: 'retain', length: minLength });

        if (op1Current.length! > minLength) {
          ops1[i1] = { ...op1Current, length: op1Current.length! - minLength };
        } else {
          i1++;
        }

        if (op2Current.length! > minLength) {
          ops2[i2] = { ...op2Current, length: op2Current.length! - minLength };
        } else {
          i2++;
        }
      } else if (op1Current.type === 'insert' && op2Current.type === 'retain') {
        const insertLength = op1Current.text!.length;
        const retainLength = op2Current.length!;

        if (insertLength <= retainLength) {
          composed.push(op1Current);
          i1++;

          if (insertLength < retainLength) {
            ops2[i2] = { ...op2Current, length: retainLength - insertLength };
          } else {
            i2++;
          }
        } else {
          composed.push({
            type: 'insert',
            text: op1Current.text!.slice(0, retainLength),
          });
          ops1[i1] = {
            ...op1Current,
            text: op1Current.text!.slice(retainLength),
          };
          i2++;
        }
      } else if (op1Current.type === 'insert' && op2Current.type === 'delete') {
        const insertLength = op1Current.text!.length;
        const deleteLength = op2Current.length!;

        if (insertLength <= deleteLength) {
          i1++;
          if (insertLength < deleteLength) {
            ops2[i2] = { ...op2Current, length: deleteLength - insertLength };
          } else {
            i2++;
          }
        } else {
          ops1[i1] = {
            ...op1Current,
            text: op1Current.text!.slice(deleteLength),
          };
          i2++;
        }
      } else if (op1Current.type === 'retain' && op2Current.type === 'delete') {
        const retainLength = op1Current.length!;
        const deleteLength = op2Current.length!;
        const minLength = Math.min(retainLength, deleteLength);

        composed.push({ type: 'delete', length: minLength });

        if (retainLength > minLength) {
          ops1[i1] = { ...op1Current, length: retainLength - minLength };
        } else {
          i1++;
        }

        if (deleteLength > minLength) {
          ops2[i2] = { ...op2Current, length: deleteLength - minLength };
        } else {
          i2++;
        }
      }
    }

    return {
      ops: this.normalize(composed),
      baseLength: op1.baseLength,
      targetLength: op2.targetLength,
    };
  }

  /**
   * 텍스트에서 작업 생성
   * @param oldText 이전 텍스트
   * @param newText 새 텍스트
   * @returns 변환 작업
   */
  static fromTextDiff(oldText: string, newText: string): TextOperation {
    // 간단한 diff 알고리즘 (실제로는 더 정교한 알고리즘 사용 권장)
    const ops: Operation[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldText.length || newIndex < newText.length) {
      if (
        oldIndex < oldText.length &&
        newIndex < newText.length &&
        oldText[oldIndex] === newText[newIndex]
      ) {
        // 같은 문자 - retain
        let retainLength = 0;
        while (
          oldIndex + retainLength < oldText.length &&
          newIndex + retainLength < newText.length &&
          oldText[oldIndex + retainLength] === newText[newIndex + retainLength]
        ) {
          retainLength++;
        }
        ops.push({ type: 'retain', length: retainLength });
        oldIndex += retainLength;
        newIndex += retainLength;
      } else if (
        newIndex < newText.length &&
        (oldIndex >= oldText.length || oldText[oldIndex] !== newText[newIndex])
      ) {
        // 새 문자 삽입
        let insertText = '';
        while (
          newIndex < newText.length &&
          (oldIndex >= oldText.length ||
            oldText[oldIndex] !== newText[newIndex])
        ) {
          insertText += newText[newIndex];
          newIndex++;
        }
        ops.push({ type: 'insert', text: insertText });
      } else {
        // 문자 삭제
        let deleteLength = 0;
        while (
          oldIndex + deleteLength < oldText.length &&
          (newIndex >= newText.length ||
            oldText[oldIndex + deleteLength] !== newText[newIndex])
        ) {
          deleteLength++;
        }
        ops.push({ type: 'delete', length: deleteLength });
        oldIndex += deleteLength;
      }
    }

    return {
      ops: this.normalize(ops),
      baseLength: oldText.length,
      targetLength: newText.length,
    };
  }
}

// 충돌 해결 전략
export class ConflictResolver {
  /**
   * 타임스탬프 기반 충돌 해결
   * @param op1 첫 번째 작업
   * @param op2 두 번째 작업
   * @param timestamp1 첫 번째 작업의 타임스탬프
   * @param timestamp2 두 번째 작업의 타임스탬프
   * @returns 해결된 작업들
   */
  static resolveByTimestamp(
    op1: TextOperation,
    op2: TextOperation,
    timestamp1: number,
    timestamp2: number
  ): [TextOperation, TextOperation] {
    const priority1 = timestamp1 < timestamp2;
    return OperationalTransform.transform(op1, op2, priority1);
  }

  /**
   * 사용자 우선순위 기반 충돌 해결
   * @param op1 첫 번째 작업
   * @param op2 두 번째 작업
   * @param userId1 첫 번째 사용자 ID
   * @param userId2 두 번째 사용자 ID
   * @param userPriorities 사용자 우선순위 맵
   * @returns 해결된 작업들
   */
  static resolveByUserPriority(
    op1: TextOperation,
    op2: TextOperation,
    userId1: string,
    userId2: string,
    userPriorities: Map<string, number>
  ): [TextOperation, TextOperation] {
    const priority1 = userPriorities.get(userId1) || 0;
    const priority2 = userPriorities.get(userId2) || 0;
    const firstHasPriority = priority1 >= priority2;

    return OperationalTransform.transform(op1, op2, firstHasPriority);
  }

  /**
   * 작업 타입 기반 충돌 해결
   * @param op1 첫 번째 작업
   * @param op2 두 번째 작업
   * @returns 해결된 작업들
   */
  static resolveByOperationType(
    op1: TextOperation,
    op2: TextOperation
  ): [TextOperation, TextOperation] {
    // Insert 작업이 Delete 작업보다 우선순위가 높음
    const hasInsert1 = op1.ops.some(op => op.type === 'insert');
    const hasInsert2 = op2.ops.some(op => op.type === 'insert');

    if (hasInsert1 && !hasInsert2) {
      return OperationalTransform.transform(op1, op2, true);
    } else if (!hasInsert1 && hasInsert2) {
      return OperationalTransform.transform(op1, op2, false);
    }

    // 같은 타입인 경우 첫 번째 작업 우선
    return OperationalTransform.transform(op1, op2, true);
  }
}
