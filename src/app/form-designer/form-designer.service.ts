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
  previewSchema: SFSchema;
  previewUi: SFUISchema;
}

@Injectable({
  providedIn: 'root',
})
export class FormDesignerService {
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

    // 1. Schema Part
    const schemaPart: any = { type: this.getSchemaType(type), title: title };
    if (type === 'date') schemaPart.format = 'date';
    if (type === 'select') schemaPart.enum = ['选项1', '选项2', '选项3'];

    // 2. UI Part (注意：这里只是配置内容，Key 在存入 ui 对象时再加 $)
    const uiPart: any = { widget: this.getWidgetType(type) };
    if (type === 'textarea') uiPart.rows = 3;

    const newNode: DesignerNode = {
      id,
      key,
      type,
      title,
      schema: schemaPart,
      ui: uiPart,
      previewSchema: { properties: { [key]: schemaPart } },
      // 【关键】previewUi 的 Key 必须带 $
      previewUi: { ['$' + key]: uiPart },
    };

    const schema = this.currentSchema;
    const ui = this.currentUISchema;
    const nodes = this.currentNodes;

    if (!schema.properties) schema.properties = {};

    // 保持 properties 顺序
    const newProperties: any = {};
    nodes.forEach((n) => {
      if ((schema.properties as any)[n.key])
        newProperties[n.key] = (schema.properties as any)[n.key];
    });
    newProperties[key] = schemaPart;
    schema.properties = newProperties;

    // 【关键】存入 UI Schema 时，Key 必须带 $
    ui['$' + key] = uiPart;

    nodes.push(newNode);

    // 更新 Order
    this.updateOrderInUI(schema, ui, nodes);
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

    const newNode: DesignerNode = {
      id: newId,
      key: newKey,
      type: sourceNode.type,
      title: newSchema.title,
      schema: newSchema,
      ui: newUi,
      previewSchema: { properties: { [newKey]: newSchema } },
      // 【关键】previewUi 的 Key 必须带 $
      previewUi: { ['$' + newKey]: newUi },
    };

    nodes.splice(index + 1, 0, newNode);

    const newProperties: any = {};
    nodes.forEach((n) => {
      newProperties[n.key] = (schema.properties as any)[n.key];
    });
    schema.properties = newProperties;

    // 【关键】存入 UI Schema 时，Key 必须带 $
    ui['$' + newKey] = newUi;

    this.updateOrderInUI(schema, ui, nodes);
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

    // 【关键】删除 UI Schema 时，Key 必须带 $
    delete ui['$' + node.key];

    if (schema.required)
      schema.required = schema.required.filter((k) => k !== node.key);

    nodes.splice(index, 1);
    this.updateOrderInUI(schema, ui, nodes);
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

    const ui = this.currentUISchema;
    this.updateOrderInUI(schema, ui, nodes);
    this.updateAll(schema, ui, nodes);
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

    // 【关键】UI Schema 的 Key 必须带 $
    const uiKey = '$' + key;

    // 1. Update Schema
    if (updates.schema && schema.properties) {
      (schema.properties as any)[key] = {
        ...(schema.properties as any)[key],
        ...updates.schema,
      };
      node.schema = (schema.properties as any)[key];
      if (updates.schema.title) node.title = updates.schema.title;
    }

    // 2. Update Required
    if (updates.required !== undefined) {
      let req = [...(schema.required || [])];
      if (updates.required && !req.includes(key)) req.push(key);
      else if (!updates.required && req.includes(key))
        req = req.filter((k) => k !== key);
      schema.required = req.length > 0 ? req : undefined;
    }

    // 3. Update UI
    if (updates.ui) {
      if (!ui[uiKey]) ui[uiKey] = {};

      Object.keys(updates.ui).forEach((prop) => {
        const value = updates.ui[prop];
        if (value === undefined) delete ui[uiKey][prop];
        else ui[uiKey][prop] = value;
      });

      node.ui = ui[uiKey];
    }

    // 4. Refresh Preview Cache
    node.previewSchema = {
      properties: { [key]: (schema.properties as any)[key] },
    };
    // 【关键】previewUi 的 Key 必须带 $
    node.previewUi = { [uiKey]: { ...ui[uiKey] } };

    // 5. Emit Changes
    this.schemaSubject.next(_.cloneDeep(schema));
    this.uiSchemaSubject.next(_.cloneDeep(ui));
    this.nodesSubject.next([...this.currentNodes]);
  }

  renameKey(id: string, newKey: string) {
    const node = this.currentNodes.find((n) => n.id === id);
    if (!node || node.key === newKey) return;
    if (this.currentNodes.some((n) => n.key === newKey))
      throw new Error(`Key "${newKey}" exists.`);

    const oldKey = node.key;
    const schema = this.currentSchema;
    const ui = this.currentUISchema;
    const nodes = this.currentNodes;

    // Migrate Schema
    if (schema.properties) {
      const oldSchema = (schema.properties as any)[oldKey];
      delete (schema.properties as any)[oldKey];
      (schema.properties as any)[newKey] = oldSchema;
    }

    // Migrate UI (Key with $)
    const oldUiKey = '$' + oldKey;
    const newUiKey = '$' + newKey;
    const oldUi = ui[oldUiKey];
    delete ui[oldUiKey];
    ui[newUiKey] = oldUi;

    // Migrate Required
    if (schema.required) {
      const idx = schema.required.indexOf(oldKey);
      if (idx !== -1) schema.required[idx] = newKey;
    }

    // Update Node
    node.key = newKey;
    node.previewSchema = {
      properties: { [newKey]: (schema.properties as any)[newKey] },
    };
    node.previewUi = { [newUiKey]: ui[newUiKey] };

    this.updateOrderInUI(schema, ui, nodes);
    this.updateAll(schema, ui, nodes);
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
        return 'boolean';
      case 'number':
        return 'input-number';
      default:
        return 'string';
    }
  }

  private updateOrderInUI(
    schema: SFSchema,
    ui: SFUISchema,
    nodes: DesignerNode[],
  ) {
    const orderKeys = nodes.map((n) => n.key); // Order 数组里存的是原始 Key
    if (!ui['*']) ui['*'] = {};
    ui['*'].order = orderKeys;
  }
}
