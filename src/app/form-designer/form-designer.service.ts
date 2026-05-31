import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SFSchema, SFUISchema } from '@delon/form';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import * as _ from 'lodash-es';

export interface DesignerNode {
  id: string;
  key: string;
  type: string;
  title: string;
  schema: any;
  ui: any;
  // 缓存用于预览的完整对象，避免模板中频繁创建新对象导致死循环
  previewSchema: SFSchema;
  previewUi: SFUISchema;
}

@Injectable({
  providedIn: 'root',
})
export class FormDesignerService {
  // ... (Subject 定义保持不变) ...
  private schemaSubject = new BehaviorSubject<SFSchema>({ properties: {} });
  private uiSchemaSubject = new BehaviorSubject<SFUISchema>({});
  private nodesSubject = new BehaviorSubject<DesignerNode[]>([]);
  private selectedIdSubject = new BehaviorSubject<string | null>(null);

  schema$ = this.schemaSubject.asObservable();
  uiSchema$ = this.uiSchemaSubject.asObservable();
  nodes$ = this.nodesSubject.asObservable();
  selectedId$ = this.selectedIdSubject.asObservable();

  get currentSchema(): SFSchema {
    return _.cloneDeep(this.schemaSubject.getValue());
  }
  get currentUISchema(): SFUISchema {
    return _.cloneDeep(this.uiSchemaSubject.getValue());
  }
  get currentNodes(): DesignerNode[] {
    return this.nodesSubject.getValue();
  }

  addField(type: string) {
    const id = this.generateId();
    const key = `field_${id.substring(0, 8)}`;
    const title = this.getDefaultTitle(type);

    const schemaPart: any = { type: this.getSchemaType(type), title: title };
    if (type === 'date') schemaPart.format = 'date';
    if (type === 'select') schemaPart.enum = ['选项1', '选项2', '选项3'];

    const uiPart: any = { widget: this.getWidgetType(type) };
    if (type === 'textarea') uiPart.rows = 3;

    // 创建缓存的预览对象
    const previewSchema: SFSchema = { properties: { [key]: schemaPart } };
    const previewUi: SFUISchema = { [key]: uiPart };

    const newNode: DesignerNode = {
      id,
      key,
      type,
      title,
      schema: schemaPart,
      ui: uiPart,
      previewSchema,
      previewUi,
    };

    const schema = this.currentSchema;
    const ui = this.currentUISchema;
    const nodes = this.currentNodes;

    if (!schema.properties) schema.properties = {};
    const newProperties: any = {};
    nodes.forEach((n) => {
      if ((schema.properties as any)[n.key])
        newProperties[n.key] = (schema.properties as any)[n.key];
    });
    newProperties[key] = schemaPart;
    schema.properties = newProperties;
    ui[key] = uiPart;
    nodes.push(newNode);

    this.updateAll(schema, ui, nodes);
    this.selectNode(id);
  }

  copyNode(id: string) {
    const nodes = this.currentNodes;
    const index = nodes.findIndex((n) => n.id === id);
    if (index === -1) return;

    const sourceNode = nodes[index];
    const schema = this.currentSchema;
    const ui = this.currentUISchema;

    const newId = this.generateId();
    const newKey = `${sourceNode.key}_copy_${newId.substring(0, 4)}`;

    const newSchema = _.cloneDeep(sourceNode.schema);
    newSchema.title = `${newSchema.title} (副本)`;
    const newUi = _.cloneDeep(sourceNode.ui);

    // 创建新的缓存预览对象
    const previewSchema: SFSchema = { properties: { [newKey]: newSchema } };
    const previewUi: SFUISchema = { [newKey]: newUi };

    const newNode: DesignerNode = {
      id: newId,
      key: newKey,
      type: sourceNode.type,
      title: newSchema.title,
      schema: newSchema,
      ui: newUi,
      previewSchema,
      previewUi,
    };

    nodes.splice(index + 1, 0, newNode);

    const newProperties: any = {};
    nodes.forEach((n) => {
      newProperties[n.key] = (schema.properties as any)[n.key];
    });
    schema.properties = newProperties;
    ui[newKey] = newUi;

    this.updateAll(schema, ui, nodes);
    this.selectNode(newId);
  }

  removeNode(id: string) {
    const nodes = this.currentNodes;
    const index = nodes.findIndex((n) => n.id === id);
    if (index === -1) return;
    const node = nodes[index];
    const schema = this.currentSchema;
    const ui = this.currentUISchema;

    if (schema.properties) delete (schema.properties as any)[node.key];
    delete ui[node.key];
    if (schema.required)
      schema.required = schema.required.filter((k) => k !== node.key);

    nodes.splice(index, 1);
    this.updateAll(schema, ui, nodes);
    this.selectNode(null);
  }

  moveNode(event: CdkDragDrop<DesignerNode[]>) {
    const nodes = this.currentNodes;
    moveItemInArray(nodes, event.previousIndex, event.currentIndex);

    const schema = this.currentSchema;
    const newProperties: any = {};
    nodes.forEach((n) => {
      if ((schema.properties as any)[n.key])
        newProperties[n.key] = (schema.properties as any)[n.key];
    });
    schema.properties = newProperties;

    this.updateAll(schema, this.currentUISchema, nodes);
  }

  updateFieldConfig(
    id: string,
    updates: { schema?: any; ui?: any; required?: boolean },
  ) {
    const node = this.currentNodes.find((n) => n.id === id);
    if (!node) return;

    const schema = this.currentSchema;
    const ui = this.currentUISchema;
    const key = node.key;

    // 1. 更新全局 Schema
    if (updates.schema && schema.properties) {
      // 注意：这里必须生成新对象，或者确保 delon form 能检测到内部变化
      // 为了保险，我们直接替换 properties 中的该项
      (schema.properties as any)[key] = {
        ...(schema.properties as any)[key],
        ...updates.schema
      };

      // 同步更新 node 中的引用
      node.schema = (schema.properties as any)[key];
      if (updates.schema.title) node.title = updates.schema.title;
    }

     // 2. 更新 Required
    if (updates.required !== undefined) {
      let req = [...(schema.required || [])];
      if (updates.required && !req.includes(key)) req.push(key);
      else if (!updates.required && req.includes(key)) req = req.filter((k) => k !== key);
      schema.required = req.length > 0 ? req : undefined;
    }


    // 3. 更新全局 UI
    if (updates.ui) {
      if (!ui[key]) ui[key] = {};
      ui[key] = { ...ui[key], ...updates.ui };
      node.ui = ui[key];
    }

    // 4. 【关键】刷新缓存的预览对象引用
    // 必须创建新的对象实例，这样 <sf> 组件的 ngOnChanges 才能检测到变化并重新渲染
    node.previewSchema = {
      properties: { [key]: (schema.properties as any)[key] }
    };
    node.previewUi = {
      [key]: ui[key]
    };
    //this.updateAll(schema, ui, this.currentNodes);

    // 5. 触发 BehaviorSubject 更新
    // 注意：nodesSubject 需要发出新数组引用，或者至少确保节点内部引用已变
    // 由于我们直接修改了 node 对象的属性，对于 BehaviorSubject 来说，
    // 如果只调用 next([...nodes]) 可能不够，因为 nodes 里的对象引用没变。
    // 但因为我们修改了 node.previewSchema 的引用，Angular 的模板绑定会检测到。

    // 为了确保万无一失，我们重新发出所有 Subject
    this.schemaSubject.next(_.cloneDeep(schema));
    this.uiSchemaSubject.next(_.cloneDeep(ui));

    // 对于 nodes，由于我们是原地修改了 node 的属性，我们需要发出一个新数组
    // 以触发 ngFor 的变更检测（虽然 ngFor 默认是按引用比较，但内部属性变化通常需要 OnPush 或显式触发）
    // 如果组件没有使用 OnPush，直接修改对象属性通常能生效。
    // 但为了触发 <sf> 的更新，关键在于 node.previewSchema 指向了新对象。

    this.nodesSubject.next([...this.currentNodes]);

  }

  selectNode(id: string | null) {
    this.selectedIdSubject.next(id);
  }

  private updateAll(schema: SFSchema, ui: SFUISchema, nodes: DesignerNode[]) {
    this.schemaSubject.next(_.cloneDeep(schema));
    this.uiSchemaSubject.next(_.cloneDeep(ui));
    this.nodesSubject.next([...nodes]);
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private getDefaultTitle(type: string): string {
    const map: Record<string, string> = {
      string: '文本输入',
      number: '数字输入',
      boolean: '开关',
      date: '日期选择',
      select: '下拉选择',
      textarea: '多行文本',
    };
    return map[type] || '新字段';
  }

  private getSchemaType(type: string): string {
    if (type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';
    return 'string';
  }

  private getWidgetType(type: string): string {
    switch (type) {
      case 'textarea':
        return 'textarea';
      case 'date':
        return 'date';
      case 'select':
        return 'select';
      case 'boolean':
        return 'checkbox';
      case 'number':
        return 'input-number';
      default:
        return 'string';
    }
  }
}
